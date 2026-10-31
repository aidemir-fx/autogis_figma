package s3client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/gmt061/autogis-backend/internal/config"
)

// S3Client wraps the AWS SDK v2 S3 client with project-specific helpers.
type S3Client struct {
	client        *s3.Client
	presignClient *s3.PresignClient
	bucket        string
	cdnBaseURL    string
	kmsKeyID      string
}

// EnsureBucket creates the configured bucket when it is missing. For a local
// S3-compatible service it can also apply a read-only public bucket policy so
// browser media URLs work without a second initialization container.
func (c *S3Client) EnsureBucket(ctx context.Context, publicRead bool) error {
	_, err := c.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(c.bucket)})
	if err != nil {
		if _, createErr := c.client.CreateBucket(ctx, &s3.CreateBucketInput{Bucket: aws.String(c.bucket)}); createErr != nil {
			return fmt.Errorf("ensure bucket %q: %w", c.bucket, createErr)
		}
	}

	if !publicRead {
		return nil
	}

	policy, err := json.Marshal(map[string]any{
		"Version": "2012-10-17",
		"Statement": []map[string]any{{
			"Effect":    "Allow",
			"Principal": "*",
			"Action":    []string{"s3:GetObject"},
			"Resource":  []string{fmt.Sprintf("arn:aws:s3:::%s/*", c.bucket)},
		}},
	})
	if err != nil {
		return fmt.Errorf("build bucket policy: %w", err)
	}
	if _, err := c.client.PutBucketPolicy(ctx, &s3.PutBucketPolicyInput{
		Bucket: aws.String(c.bucket),
		Policy: aws.String(string(policy)),
	}); err != nil {
		return fmt.Errorf("set bucket policy: %w", err)
	}
	return nil
}

// New creates an S3Client from application config.
// If S3Endpoint is set (non-empty), it is used as a custom endpoint (e.g. MinIO in dev).
func New(cfg *config.Config) (*S3Client, error) {
	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.S3Region),
	}

	// Use static credentials when provided (dev/CI). In production, rely on IAM role.
	if cfg.S3AccessKeyID != "" && cfg.S3SecretAccessKey != "" {
		opts = append(opts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.S3AccessKeyID, cfg.S3SecretAccessKey, ""),
		))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), opts...)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	var s3Opts []func(*s3.Options)
	if cfg.S3Endpoint != "" {
		s3Opts = append(s3Opts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(endpointURL(cfg.S3Endpoint, cfg.S3UseSSL))
			o.UsePathStyle = true // required for MinIO / LocalStack
		})
	}

	cli := s3.NewFromConfig(awsCfg, s3Opts...)
	presignClient := s3.NewPresignClient(cli)

	// The API may reach MinIO through an internal Docker hostname while the
	// browser needs a public hostname for direct uploads. Use a separate client
	// for presigning when that public endpoint is configured.
	if cfg.S3PublicEndpoint != "" {
		publicS3Opts := append([]func(*s3.Options){}, s3Opts...)
		publicS3Opts = append(publicS3Opts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(endpointURL(cfg.S3PublicEndpoint, cfg.S3UseSSL))
			o.UsePathStyle = true
		})
		publicClient := s3.NewFromConfig(awsCfg, publicS3Opts...)
		presignClient = s3.NewPresignClient(publicClient)
	}

	return &S3Client{
		client:        cli,
		presignClient: presignClient,
		bucket:        cfg.S3Bucket,
		cdnBaseURL:    cfg.CDNBaseURL,
		kmsKeyID:      cfg.S3KMSKeyID,
	}, nil
}

func endpointURL(endpoint string, useSSL bool) string {
	if strings.Contains(endpoint, "://") {
		return endpoint
	}
	scheme := "http"
	if useSSL {
		scheme = "https"
	}
	return scheme + "://" + endpoint
}

// PresignPutURL generates a pre-signed PUT URL for direct browser-to-S3 upload.
// The signing includes Content-Type and SSE-KMS headers so the client must send them.
// Returns the pre-signed URL and the map of required request headers.
func (c *S3Client) PresignPutURL(ctx context.Context, key, mimeType string, ttl time.Duration) (string, map[string]string, error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(mimeType),
	}

	// Apply SSE-KMS only when a key ID is configured (skipped for local dev without KMS).
	if c.kmsKeyID != "" {
		input.ServerSideEncryption = types.ServerSideEncryptionAwsKms
		input.SSEKMSKeyId = aws.String(c.kmsKeyID)
	}

	req, err := c.presignClient.PresignPutObject(ctx, input, func(o *s3.PresignOptions) {
		o.Expires = ttl
	})
	if err != nil {
		return "", nil, fmt.Errorf("presign put: %w", err)
	}

	headers := map[string]string{
		"Content-Type": mimeType,
	}
	if c.kmsKeyID != "" {
		headers["x-amz-server-side-encryption"] = "aws:kms"
		headers["x-amz-server-side-encryption-aws-kms-key-id"] = c.kmsKeyID
	}

	return req.URL, headers, nil
}

// HeadObject returns metadata for an object. Returns (nil, nil) when the object does not exist.
func (c *S3Client) HeadObject(ctx context.Context, key string) (*s3.HeadObjectOutput, error) {
	out, err := c.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

// GetObject downloads an object body for processing. Caller must close the reader.
func (c *S3Client) GetObject(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := c.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("get object %q: %w", key, err)
	}
	return out.Body, nil
}

// PutObject uploads raw bytes to S3 with the given MIME type.
func (c *S3Client) PutObject(ctx context.Context, key, mimeType string, body io.Reader, size int64) error {
	input := &s3.PutObjectInput{
		Bucket:        aws.String(c.bucket),
		Key:           aws.String(key),
		Body:          body,
		ContentType:   aws.String(mimeType),
		ContentLength: aws.Int64(size),
	}
	if c.kmsKeyID != "" {
		input.ServerSideEncryption = types.ServerSideEncryptionAwsKms
		input.SSEKMSKeyId = aws.String(c.kmsKeyID)
	}
	_, err := c.client.PutObject(ctx, input)
	return err
}

// CopyObject copies src key to dst key within the same bucket.
func (c *S3Client) CopyObject(ctx context.Context, srcKey, dstKey string) error {
	copySource := fmt.Sprintf("%s/%s", c.bucket, srcKey)
	input := &s3.CopyObjectInput{
		Bucket:     aws.String(c.bucket),
		CopySource: aws.String(copySource),
		Key:        aws.String(dstKey),
	}
	if c.kmsKeyID != "" {
		input.ServerSideEncryption = types.ServerSideEncryptionAwsKms
		input.SSEKMSKeyId = aws.String(c.kmsKeyID)
	}
	_, err := c.client.CopyObject(ctx, input)
	return err
}

// DeleteObject removes a single object. Silently ignores NoSuchKey.
func (c *S3Client) DeleteObject(ctx context.Context, key string) error {
	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	return err
}

// CDNURLForKey builds the public CDN URL for a given S3 key.
func (c *S3Client) CDNURLForKey(key string) string {
	return fmt.Sprintf("%s/%s", c.cdnBaseURL, key)
}

// Bucket returns the configured bucket name.
func (c *S3Client) Bucket() string { return c.bucket }
