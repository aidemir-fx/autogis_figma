package usecase

import (
	"context"
	"math"
	"testing"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gmt061/autogis-backend/internal/pkg/s3client"
	"github.com/gmt061/autogis-backend/internal/repository"
)

type storyLayoutRepo struct {
	repository.StoryRepository
	saved *domain.Story
}

func (r *storyLayoutRepo) Create(_ context.Context, story *domain.Story) error {
	r.saved = story
	story.ID = "story"
	story.CreatedAt = time.Now()
	return nil
}

func (r *storyLayoutRepo) GetAuthor(_ context.Context, id string) (*domain.StoryAuthorResponse, error) {
	return &domain.StoryAuthorResponse{UserID: id, Role: domain.RoleMaster}, nil
}

func (r *storyLayoutRepo) HasViewed(context.Context, string, string) (bool, error) {
	return false, nil
}

type storyLayoutMediaRepo struct{ repository.MediaRepository }

func (r *storyLayoutMediaRepo) GetAssetByID(_ context.Context, id string) (*domain.MediaAsset, error) {
	key := "stories/photo.jpg"
	return &domain.MediaAsset{ID: id, EntityType: domain.MediaEntityStory, EntityID: "author",
		Category: domain.MediaCategoryStory, CreatedBy: "author", Status: domain.MediaStatusReady,
		MimeType: "image/jpeg", ObjectKey: &key}, nil
}

func TestStoryImageLayoutRoundTrip(t *testing.T) {
	for _, tc := range []struct {
		name, fit, wantFit                   string
		scale, x, y, wantScale, wantX, wantY float64
	}{
		{"contain and reposition", "contain", "contain", 2.25, -0.2, 0.3, 2.25, -0.2, 0.3},
		{"legacy client", "", "contain", 0, 0, 0, 1, 0, 0},
		{"bounded values", "invalid", "contain", 100, -2, 2, 4, -0.5, 0.5},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo := &storyLayoutRepo{}
			media := &MediaUseCase{mediaRepo: &storyLayoutMediaRepo{}, s3: &s3client.S3Client{}}
			uc := NewStoryUseCase(repo, nil, nil, media)
			asset, text := "asset", "Акция до конца недели"
			before := time.Now()
			response, err := uc.CreateStory(context.Background(), "author", &domain.CreateStoryRequest{
				Frames: []domain.CreateStoryFrameRequest{{Kind: domain.StoryFrameImage, AssetID: &asset, Text: &text,
					ImageFit: tc.fit, ImageScale: tc.scale, ImageX: tc.x, ImageY: tc.y}},
			})
			if err != nil {
				t.Fatal(err)
			}
			if len(response.Frames) != 1 {
				t.Fatalf("expected one image, got %d", len(response.Frames))
			}
			stored, returned := repo.saved.Frames[0], response.Frames[0]
			if stored.ImageFit != tc.wantFit || stored.ImageScale != tc.wantScale || stored.ImageX != tc.wantX || stored.ImageY != tc.wantY {
				t.Fatalf("layout not saved correctly: %+v", stored)
			}
			if returned.ImageFit != stored.ImageFit || returned.ImageScale != stored.ImageScale || returned.ImageX != stored.ImageX || returned.ImageY != stored.ImageY {
				t.Fatalf("response lost layout: %+v", returned)
			}
			if returned.ImageURL == "" || returned.Text == nil || *returned.Text != text {
				t.Fatal("image or overlay missing")
			}
			if repo.saved.ExpiresAt.Before(before.Add(24*time.Hour)) || repo.saved.ExpiresAt.After(time.Now().Add(24*time.Hour)) {
				t.Fatal("24-hour story lifetime changed")
			}
		})
	}
}

func TestBoundedStoryNumberRejectsNonFiniteValues(t *testing.T) {
	for _, value := range []float64{math.NaN(), math.Inf(1), math.Inf(-1)} {
		if boundedStoryNumber(value, 1, 4, 1) != 1 {
			t.Fatal("expected safe zoom fallback")
		}
		if boundedStoryNumber(value, -0.5, 0.5, 0) != 0 {
			t.Fatal("expected safe position fallback")
		}
	}
}
