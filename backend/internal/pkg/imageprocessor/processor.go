// Package imageprocessor validates, normalises and generates derivative images.
//
// Validation pipeline (all executed before writing to the final key):
//  1. Magic-bytes detection via mimetype — rejects content that does not match
//     the declared MIME type.
//  2. Dimension check — rejects images outside the allowed size range.
//  3. EXIF orientation — auto-rotates JPEG images using the Orientation tag,
//     then strips all EXIF metadata by re-encoding.
//  4. Derivative generation — thumb (256 px), medium (1024 px), large (2048 px
//     only when source is larger).
package imageprocessor

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/gabriel-vasile/mimetype"
	"github.com/rwcarlsen/goexif/exif"
	_ "golang.org/x/image/webp"

	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gmt061/autogis-backend/internal/pkg/s3client"
)

const (
	minDimension     = 256
	maxDimension     = 8000
	thumbSize        = 256
	mediumSize       = 1024
	largeSize        = 2048
	jpegQuality      = 85
	maxDownloadBytes = 20 << 20 // 20 MB guard against malformed Content-Length
)

var allowedMIMEs = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"video/mp4":  true,
	"video/webm": true,
}

// DerivativeResult describes one generated variant.
type DerivativeResult struct {
	Variant   domain.MediaVariant
	Format    string // "jpeg"
	ObjectKey string
	MimeType  string
	SizeBytes int64
	Width     int
	Height    int
}

// ProcessResult is returned after successful processing.
type ProcessResult struct {
	FinalKey       string
	MimeType       string
	Width          int
	Height         int
	SizeBytes      int64
	ChecksumSHA256 string
	Derivatives    []DerivativeResult
}

// Processor handles image processing against S3.
type Processor struct {
	s3 *s3client.S3Client
}

// New creates a Processor backed by the given S3 client.
func New(s3 *s3client.S3Client) *Processor {
	return &Processor{s3: s3}
}

// Process validates and processes the image at stagingKey, writes the result to
// finalKey, uploads derivatives, and returns metadata.
//
// On any validation error the caller is expected to move the object to quarantine
// and mark the asset as failed. Process itself never writes to quarantine.
func (p *Processor) Process(ctx context.Context, stagingKey, finalKey, entityType, entityID, sourceUUID string, trimStart, trimEnd float64) (*ProcessResult, error) {
	if head, err := p.s3.HeadObject(ctx, stagingKey); err == nil && head.ContentType != nil && strings.HasPrefix(*head.ContentType, "video/") {
		if !allowedMIMEs[*head.ContentType] {
			return nil, fmt.Errorf("unsupported video type: %s", *head.ContentType)
		}
		if trimEnd <= trimStart {
			if err := p.s3.CopyObject(ctx, stagingKey, finalKey); err != nil {
				return nil, fmt.Errorf("copy video %q: %w", finalKey, err)
			}
			size := int64(0)
			if head.ContentLength != nil {
				size = *head.ContentLength
			}
			return &ProcessResult{FinalKey: finalKey, MimeType: *head.ContentType, SizeBytes: size}, nil
		}
		return p.processVideo(ctx, stagingKey, finalKey, *head.ContentType, trimStart, trimEnd)
	}
	// ── 1. Download from staging ──────────────────────────────────────────────
	body, err := p.s3.GetObject(ctx, stagingKey)
	if err != nil {
		return nil, fmt.Errorf("download staging %q: %w", stagingKey, err)
	}
	defer body.Close()

	raw, err := io.ReadAll(io.LimitReader(body, maxDownloadBytes))
	if err != nil {
		return nil, fmt.Errorf("read staging body: %w", err)
	}

	// ── 2. Magic-bytes validation ─────────────────────────────────────────────
	mt := mimetype.Detect(raw)
	detectedMIME := mt.String()
	// Strip parameters (e.g. "image/jpeg; charset=...")
	for i, b := range detectedMIME {
		if b == ';' {
			detectedMIME = detectedMIME[:i]
			break
		}
	}
	if !allowedMIMEs[detectedMIME] {
		return nil, fmt.Errorf("invalid file type: detected %q is not allowed", detectedMIME)
	}

	// ── 3. Decode image ───────────────────────────────────────────────────────
	img, err := decodeImage(raw, detectedMIME)
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}

	// ── 4. EXIF auto-rotate (JPEG only) ──────────────────────────────────────
	if detectedMIME == "image/jpeg" {
		img = autoRotate(raw, img)
	}

	bounds := img.Bounds()
	w := bounds.Max.X - bounds.Min.X
	h := bounds.Max.Y - bounds.Min.Y

	// ── 5. Dimension validation ───────────────────────────────────────────────
	maxSide := w
	if h > maxSide {
		maxSide = h
	}
	minSide := w
	if h < minSide {
		minSide = h
	}
	if minSide < minDimension {
		return nil, fmt.Errorf("image too small: min side %d px (required >= %d)", minSide, minDimension)
	}
	if maxSide > maxDimension {
		return nil, fmt.Errorf("image too large: max side %d px (allowed <= %d)", maxSide, maxDimension)
	}

	// ── 6. Re-encode to strip EXIF; compute checksum ──────────────────────────
	cleanBuf, err := encodeJPEG(img)
	if err != nil {
		return nil, fmt.Errorf("re-encode image: %w", err)
	}

	sum := sha256.Sum256(cleanBuf)
	checksum := hex.EncodeToString(sum[:])

	// ── 7. Upload to final key ────────────────────────────────────────────────
	finalMIME := "image/jpeg"
	if err := p.s3.PutObject(ctx, finalKey, finalMIME, bytes.NewReader(cleanBuf), int64(len(cleanBuf))); err != nil {
		return nil, fmt.Errorf("upload final %q: %w", finalKey, err)
	}

	// ── 8. Generate derivatives ───────────────────────────────────────────────
	derivatives, err := p.generateDerivatives(ctx, img, entityType, entityID, sourceUUID, maxSide)
	if err != nil {
		return nil, fmt.Errorf("generate derivatives: %w", err)
	}

	return &ProcessResult{
		FinalKey:       finalKey,
		MimeType:       finalMIME,
		Width:          w,
		Height:         h,
		SizeBytes:      int64(len(cleanBuf)),
		ChecksumSHA256: checksum,
		Derivatives:    derivatives,
	}, nil
}

// processVideo downloads the private staging object, cuts the requested range
// with FFmpeg, and uploads only the resulting clip to the final key. The source
// staging object is removed by the worker after this method succeeds.
func (p *Processor) processVideo(ctx context.Context, stagingKey, finalKey, mimeType string, trimStart, trimEnd float64) (*ProcessResult, error) {
	if trimStart < 0 || trimEnd <= trimStart || trimEnd-trimStart > 4*60+0.05 {
		return nil, fmt.Errorf("invalid video trim range %.3f-%.3f", trimStart, trimEnd)
	}
	input, err := os.CreateTemp("", "autogis-video-source-*")
	if err != nil {
		return nil, fmt.Errorf("create video temp file: %w", err)
	}
	inputPath := input.Name()
	defer os.Remove(inputPath)
	body, err := p.s3.GetObject(ctx, stagingKey)
	if err != nil {
		input.Close()
		return nil, fmt.Errorf("download video %q: %w", stagingKey, err)
	}
	if _, err := io.Copy(input, body); err != nil {
		body.Close()
		input.Close()
		return nil, fmt.Errorf("save source video: %w", err)
	}
	body.Close()
	if err := input.Close(); err != nil {
		return nil, fmt.Errorf("close source video: %w", err)
	}

	output, err := os.CreateTemp("", "autogis-video-clip-*")
	if err != nil {
		return nil, fmt.Errorf("create video output: %w", err)
	}
	outputPath := output.Name() + filepath.Ext(finalKey)
	output.Close()
	defer os.Remove(outputPath)
	_ = os.Remove(output.Name())

	duration := trimEnd - trimStart
	args := []string{"-hide_banner", "-loglevel", "error", "-y", "-ss", fmt.Sprintf("%.3f", trimStart), "-i", inputPath,
		"-t", fmt.Sprintf("%.3f", duration), "-map", "0:v:0", "-map", "0:a:0?"}
	if mimeType == "video/webm" {
		args = append(args, "-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "4", "-crf", "32", "-b:v", "0", "-c:a", "libopus", "-b:a", "128k")
	} else {
		args = append(args, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart")
	}
	args = append(args, outputPath)
	if outputBytes, err := exec.CommandContext(ctx, "ffmpeg", args...).CombinedOutput(); err != nil {
		return nil, fmt.Errorf("ffmpeg trim failed: %w: %s", err, strings.TrimSpace(string(outputBytes)))
	}
	stat, err := os.Stat(outputPath)
	if err != nil {
		return nil, fmt.Errorf("stat trimmed video: %w", err)
	}
	trimmed, err := os.Open(outputPath)
	if err != nil {
		return nil, fmt.Errorf("open trimmed video: %w", err)
	}
	defer trimmed.Close()
	if err := p.s3.PutObject(ctx, finalKey, mimeType, trimmed, stat.Size()); err != nil {
		return nil, fmt.Errorf("upload trimmed video %q: %w", finalKey, err)
	}
	return &ProcessResult{FinalKey: finalKey, MimeType: mimeType, SizeBytes: stat.Size()}, nil
}

// generateDerivatives creates thumb / medium / large variants and uploads them.
func (p *Processor) generateDerivatives(
	ctx context.Context,
	img image.Image,
	entityType, entityID, sourceUUID string,
	maxSide int,
) ([]DerivativeResult, error) {
	variants := []struct {
		variant domain.MediaVariant
		size    int
	}{
		{domain.MediaVariantThumb, thumbSize},
		{domain.MediaVariantMedium, mediumSize},
	}
	// large only when source is larger than largeSize
	if maxSide > largeSize {
		variants = append(variants, struct {
			variant domain.MediaVariant
			size    int
		}{domain.MediaVariantLarge, largeSize})
	}

	var results []DerivativeResult
	for _, v := range variants {
		resized := imaging.Fit(img, v.size, v.size, imaging.Lanczos)
		buf, err := encodeJPEG(resized)
		if err != nil {
			return nil, fmt.Errorf("encode %s: %w", v.variant, err)
		}

		rb := resized.Bounds()
		dw := rb.Max.X - rb.Min.X
		dh := rb.Max.Y - rb.Min.Y

		key := fmt.Sprintf("%ss/%s/derivatives/%s/%s.jpeg", entityType, entityID, sourceUUID, v.variant)
		if err := p.s3.PutObject(ctx, key, "image/jpeg", bytes.NewReader(buf), int64(len(buf))); err != nil {
			return nil, fmt.Errorf("upload derivative %s: %w", v.variant, err)
		}

		results = append(results, DerivativeResult{
			Variant:   v.variant,
			Format:    "jpeg",
			ObjectKey: key,
			MimeType:  "image/jpeg",
			SizeBytes: int64(len(buf)),
			Width:     dw,
			Height:    dh,
		})
	}
	return results, nil
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func decodeImage(raw []byte, mime string) (image.Image, error) {
	r := bytes.NewReader(raw)
	switch mime {
	case "image/jpeg":
		img, err := jpeg.Decode(r)
		if err != nil {
			return nil, err
		}
		return img, nil
	case "image/png":
		img, err := png.Decode(r)
		if err != nil {
			return nil, err
		}
		return img, nil
	case "image/webp":
		// golang.org/x/image/webp supports decoding only.
		img, _, err := image.Decode(r)
		if err != nil {
			return nil, fmt.Errorf("decode webp: %w", err)
		}
		return img, nil
	default:
		return nil, fmt.Errorf("unsupported MIME for decode: %s", mime)
	}
}

func encodeJPEG(img image.Image) ([]byte, error) {
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: jpegQuality}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// autoRotate reads EXIF orientation from raw JPEG bytes and rotates img accordingly.
// Returns original img on any error (best-effort).
func autoRotate(raw []byte, img image.Image) image.Image {
	x, err := exif.Decode(bytes.NewReader(raw))
	if err != nil {
		return img
	}
	tag, err := x.Get(exif.Orientation)
	if err != nil {
		return img
	}
	orientation, err := tag.Int(0)
	if err != nil {
		return img
	}
	switch orientation {
	case 3:
		return imaging.Rotate180(img)
	case 6:
		return imaging.Rotate270(img)
	case 8:
		return imaging.Rotate90(img)
	default:
		return img
	}
}
