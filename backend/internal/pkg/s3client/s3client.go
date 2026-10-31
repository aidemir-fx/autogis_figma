package s3client

import (
	"context"
	"errors"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gmt061/autogis-backend/internal/config"
)

type Client struct {
	client *s3.Client
	bucket string
}

func New(cfg *config.Config) (*Client, error) {
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if cfg.S3Endpoint != "" {
			url := "http://" + cfg.S3Endpoint
			if cfg.S3UseSSL {
				url = "https://" + cfg.S3Endpoint
			}
			return aws.Endpoint{
				URL:           url,
				SigningRegion: cfg.S3Region,
			}, nil
		}
		return aws.Endpoint{}, errors.New("endpoint not found")
	})

	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.S3Region),
		awsconfig.WithEndpointResolverWithOptions(customResolver),
	}

	if cfg.S3AccessKeyID != "" && cfg.S3SecretAccessKey != "" {
		opts = append(opts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.S3AccessKeyID, cfg.S3SecretAccessKey, ""),
		))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.TODO(), opts...)
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &Client{
		client: client,
		bucket: cfg.S3Bucket,
	}, nil
}

func (c *Client) EnsureBucket(ctx context.Context, publicRead bool) error {
	_, err := c.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(c.bucket),
	})
	if err == nil {
		return nil
	}

	_, err = c.client.CreateBucket(ctx, &s3.CreateBucketInput{
		Bucket: aws.String(c.bucket),
	})
	return err
}

func (c *Client) PutObject(ctx context.Context, key string, body io.Reader, contentType string) error {
	_, err := c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	return err
}

func (c *Client) GetObject(ctx context.Context, key string) (io.ReadCloser, error) {
	output, err := c.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	return output.Body, nil
}

func (c *Client) DeleteObject(ctx context.Context, key string) error {
	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	return err
}

func (c *Client) GetPresignedURL(ctx context.Context, key string, expire time.Duration) (string, error) {
	presigner := s3.NewPresignClient(c.client)
	req, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expire))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}
