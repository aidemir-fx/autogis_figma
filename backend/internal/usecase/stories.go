package usecase

import (
	"context"
	"errors"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/pkg/storylog"
	"github.com/gmt061/autogis-backend/internal/repository"
	"gorm.io/gorm"
)

const (
	maxStoryFrames         = 10
	storyTTL               = 24 * time.Hour
	maxHighlights          = 10
	maxStorySeconds        = 4 * 60
	maxVideoSegmentSeconds = 60
)

var storyBackgrounds = map[string]struct{}{
	"#1d4ed8": {},
	"#0f766e": {},
	"#be123c": {},
	"#7c3aed": {},
	"#0f172a": {},
	"#f59e0b": {},
}

type StoryUseCase struct {
	storyRepo        repository.StoryRepository
	subscriptionRepo repository.SubscriptionRepository
	mediaRepo        repository.MediaRepository
	mediaUseCase     *MediaUseCase
	storyLog         *storylog.Logger
}

func NewStoryUseCase(
	storyRepo repository.StoryRepository,
	subscriptionRepo repository.SubscriptionRepository,
	mediaRepo repository.MediaRepository,
	mediaUseCase *MediaUseCase,
	logs ...*storylog.Logger,
) *StoryUseCase {
	var storyLogger *storylog.Logger
	if len(logs) > 0 {
		storyLogger = logs[0]
	}
	return &StoryUseCase{
		storyRepo:        storyRepo,
		subscriptionRepo: subscriptionRepo,
		mediaRepo:        mediaRepo,
		mediaUseCase:     mediaUseCase,
		storyLog:         storyLogger,
	}
}

func (uc *StoryUseCase) CreateStory(ctx context.Context, userID string, req *domain.CreateStoryRequest) (*domain.StoryResponse, error) {
	uc.storyLog.Printf("%s", storylog.Event("story_publish_started", "user", userID, "frames", len(req.Frames)))
	if len(req.Frames) == 0 || len(req.Frames) > maxStoryFrames {
		return nil, apperrors.New("INVALID_STORY", "В сторис может быть от 1 до 10 кадров", http.StatusBadRequest)
	}
	author, err := uc.storyRepo.GetAuthor(ctx, userID)
	if err != nil || author == nil {
		return nil, apperrors.New("PROFESSIONAL_ONLY", "Публиковать сторис могут только мастера и бизнес", http.StatusForbidden)
	}

	frames := make([]domain.StoryFrame, 0, len(req.Frames))
	totalVideoSeconds := 0.0
	assetSizes := make(map[string]int64)
	for index, input := range req.Frames {
		frame := domain.StoryFrame{
			Position:   index,
			Kind:       input.Kind,
			Background: normalizeStoryBackground(input.Background),
			FontSize:   normalizeStoryFontSize(input.FontSize),
			ImageFit:   normalizeStoryImageFit(input.ImageFit),
			ImageScale: boundedStoryNumber(input.ImageScale, 1, 4, 1),
			ImageX:     boundedStoryNumber(input.ImageX, -0.5, 0.5, 0),
			ImageY:     boundedStoryNumber(input.ImageY, -0.5, 0.5, 0),
			TextX:      boundedStoryNumber(input.TextX, -0.38, 0.38, 0),
			TextY:      boundedStoryNumber(input.TextY, -0.42, 0.42, 0),
		}
		if input.Kind != domain.StoryFrameText && input.TextY == 0 {
			frame.TextY = 0.32
		}

		switch input.Kind {
		case domain.StoryFrameText:
			text := strings.TrimSpace(valueOrEmpty(input.Text))
			if text == "" || len([]rune(text)) > 1000 {
				return nil, apperrors.New("INVALID_STORY_TEXT", "Текст сторис должен содержать от 1 до 1000 символов", http.StatusBadRequest)
			}
			frame.Text = &text
		case domain.StoryFrameImage:
			if input.AssetID == nil || strings.TrimSpace(*input.AssetID) == "" {
				return nil, apperrors.New("INVALID_STORY_IMAGE", "Для изображения не указан файл", http.StatusBadRequest)
			}
			asset, err := uc.mediaUseCase.ValidateOwnedStoryAsset(ctx, userID, *input.AssetID)
			if err != nil {
				return nil, err
			}
			if !strings.HasPrefix(asset.MimeType, "image/") {
				return nil, apperrors.New("INVALID_STORY_IMAGE", "Указанный файл не является изображением", http.StatusBadRequest)
			}
			assetID := strings.TrimSpace(*input.AssetID)
			frame.AssetID = &assetID
			if text := strings.TrimSpace(valueOrEmpty(input.Text)); text != "" {
				if len([]rune(text)) > 1000 {
					return nil, apperrors.New("INVALID_STORY_TEXT", "Текст сторис должен содержать не более 1000 символов", http.StatusBadRequest)
				}
				frame.Text = &text
			}
		case domain.StoryFrameVideo:
			if input.AssetID == nil || strings.TrimSpace(*input.AssetID) == "" {
				return nil, apperrors.New("INVALID_STORY_VIDEO", "Для видео не указан файл", http.StatusBadRequest)
			}
			asset, assetErr := uc.mediaUseCase.ValidateOwnedStoryAsset(ctx, userID, *input.AssetID)
			if assetErr != nil {
				return nil, assetErr
			}
			if !strings.HasPrefix(asset.MimeType, "video/") {
				return nil, apperrors.New("INVALID_STORY_VIDEO", "Указанный файл не является видео", http.StatusBadRequest)
			}
			start, end := input.VideoStart, input.VideoEnd
			if start < 0 || end <= start || end-start > maxVideoSegmentSeconds+0.01 {
				return nil, apperrors.New("INVALID_STORY_VIDEO", "Каждый видео-слайд должен длиться не более 60 секунд", http.StatusBadRequest)
			}
			totalVideoSeconds += end - start
			assetID := strings.TrimSpace(*input.AssetID)
			frame.AssetID = &assetID
			frame.VideoStart, frame.VideoEnd = start, end
			assetSizes[assetID] = asset.SizeBytes
			if text := strings.TrimSpace(valueOrEmpty(input.Text)); text != "" {
				if len([]rune(text)) > 1000 {
					return nil, apperrors.New("INVALID_STORY_TEXT", "Текст сторис должен содержать не более 1000 символов", http.StatusBadRequest)
				}
				frame.Text = &text
			}
		default:
			return nil, apperrors.New("INVALID_STORY_FRAME", "Неизвестный тип кадра сторис", http.StatusBadRequest)
		}
		frames = append(frames, frame)
	}
	if totalVideoSeconds > maxStorySeconds+0.01 {
		return nil, apperrors.New("STORY_DURATION_LIMIT", "Общая длительность видео в публикации не может превышать 4 минуты", http.StatusBadRequest)
	}
	var totalVideoBytes int64
	for _, size := range assetSizes {
		totalVideoBytes += size
	}
	if totalVideoBytes > 400<<20 {
		return nil, apperrors.New("STORY_SIZE_LIMIT", "Общий размер видео в публикации не может превышать 400 МБ", http.StatusBadRequest)
	}

	story := &domain.Story{
		AuthorUserID: userID,
		Frames:       frames,
		ExpiresAt:    time.Now().Add(storyTTL),
	}
	if err := uc.storyRepo.Create(ctx, story); err != nil {
		for _, frame := range frames {
			if frame.AssetID != nil {
				_ = uc.mediaUseCase.PurgeAssetNow(ctx, *frame.AssetID)
			}
		}
		return nil, err
	}
	response, responseErr := uc.toResponse(ctx, story, userID)
	if responseErr == nil {
		uc.storyLog.Printf("%s", storylog.Event("story_publish_ready", "user", userID, "story", story.ID, "frames", len(story.Frames)))
	}
	return response, responseErr
}

func (uc *StoryUseCase) GetHomeFeed(ctx context.Context, viewerID string) (*domain.StoryFeedResponse, error) {
	// На первом этапе показываем в поиске все активные сторис профессиональных
	// аккаунтов. Подписки по-прежнему используются для действий подписки, но не
	// ограничивают временную ленту объявлений.
	stories, err := uc.storyRepo.ListActive(ctx)
	if err != nil {
		return nil, err
	}
	return uc.toFeedResponse(ctx, stories, viewerID)
}

func (uc *StoryUseCase) GetAuthorStories(ctx context.Context, authorID, viewerID string) (*domain.StoryFeedResponse, error) {
	if _, err := uc.storyRepo.GetAuthor(ctx, authorID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	stories, err := uc.storyRepo.ListActiveByAuthor(ctx, authorID)
	if err != nil {
		return nil, err
	}
	return uc.toFeedResponse(ctx, stories, viewerID)
}

func (uc *StoryUseCase) GetAuthorHighlights(ctx context.Context, authorID, viewerID string) ([]*domain.StoryHighlightResponse, error) {
	author, err := uc.storyRepo.GetAuthor(ctx, authorID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	highlights, err := uc.storyRepo.ListHighlightsByAuthor(ctx, authorID)
	if err != nil {
		return nil, err
	}
	result := make([]*domain.StoryHighlightResponse, 0, len(highlights))
	for _, highlight := range highlights {
		stories := make([]*domain.StoryResponse, 0, len(highlight.Stories))
		for _, item := range highlight.Stories {
			if item.Story == nil {
				continue
			}
			story, storyErr := uc.toResponse(ctx, item.Story, viewerID)
			if storyErr != nil {
				return nil, storyErr
			}
			stories = append(stories, story)
		}
		if len(stories) == 0 {
			continue
		}
		result = append(result, &domain.StoryHighlightResponse{
			ID: highlight.ID, Title: highlight.Title, Author: *author,
			Stories: stories, CreatedAt: highlight.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	return result, nil
}

func (uc *StoryUseCase) AddStoryToHighlight(ctx context.Context, userID, storyID, title string) (*domain.StoryHighlightResponse, error) {
	title = strings.TrimSpace(title)
	if title == "" || len([]rune(title)) > 48 {
		return nil, apperrors.New("INVALID_HIGHLIGHT", "Название подборки должно содержать от 1 до 48 символов", http.StatusBadRequest)
	}
	story, err := uc.storyRepo.GetByID(ctx, storyID)
	if err != nil {
		return nil, err
	}
	if story == nil {
		return nil, apperrors.ErrNotFound
	}
	if story.AuthorUserID != userID {
		return nil, apperrors.New("FORBIDDEN", "Нельзя сохранить чужую сторис", http.StatusForbidden)
	}
	highlight, err := uc.storyRepo.GetHighlightByTitle(ctx, userID, title)
	if err != nil {
		return nil, err
	}
	if highlight == nil {
		highlights, listErr := uc.storyRepo.ListHighlightsByAuthor(ctx, userID)
		if listErr != nil {
			return nil, listErr
		}
		if len(highlights) >= maxHighlights {
			return nil, apperrors.New("HIGHLIGHT_LIMIT", "Можно создать не больше 10 подборок", http.StatusBadRequest)
		}
		highlight = &domain.StoryHighlight{AuthorUserID: userID, Title: title, Position: len(highlights)}
		if err := uc.storyRepo.CreateHighlight(ctx, highlight); err != nil {
			return nil, err
		}
	}
	if err := uc.storyRepo.AddStoryToHighlight(ctx, &domain.StoryHighlightStory{HighlightID: highlight.ID, StoryID: storyID}); err != nil {
		return nil, err
	}
	highlights, err := uc.GetAuthorHighlights(ctx, userID, userID)
	if err != nil {
		return nil, err
	}
	for _, item := range highlights {
		if item.ID == highlight.ID {
			return item, nil
		}
	}
	return nil, apperrors.ErrNotFound
}

func (uc *StoryUseCase) RemoveStoryFromHighlight(ctx context.Context, userID, storyID, highlightID string) error {
	story, err := uc.storyRepo.GetByID(ctx, storyID)
	if err != nil {
		return err
	}
	if story == nil {
		return apperrors.ErrNotFound
	}
	if story.AuthorUserID != userID {
		return apperrors.New("FORBIDDEN", "Нельзя изменять чужую сторис", http.StatusForbidden)
	}

	highlight, err := uc.storyRepo.GetHighlightByID(ctx, userID, highlightID)
	if err != nil {
		return err
	}
	if highlight == nil {
		return apperrors.ErrNotFound
	}

	return uc.storyRepo.RemoveStoryFromHighlight(ctx, highlight.ID, story.ID)
}

func (uc *StoryUseCase) DeleteStory(ctx context.Context, userID, storyID string) error {
	story, err := uc.storyRepo.GetByID(ctx, storyID)
	if err != nil {
		return err
	}
	if story == nil {
		return apperrors.ErrNotFound
	}
	if story.AuthorUserID != userID {
		return apperrors.New("FORBIDDEN", "Нельзя удалить чужую сторис", http.StatusForbidden)
	}
	for _, frame := range story.Frames {
		if frame.AssetID != nil {
			_ = uc.mediaUseCase.PurgeAssetNow(ctx, *frame.AssetID)
		}
	}
	return uc.storyRepo.Delete(ctx, storyID)
}

func (uc *StoryUseCase) RecordView(ctx context.Context, viewerID, storyID string) error {
	story, err := uc.storyRepo.GetByID(ctx, storyID)
	if err != nil {
		return err
	}
	if story == nil || time.Now().After(story.ExpiresAt) {
		return apperrors.ErrNotFound
	}
	return uc.storyRepo.RecordView(ctx, &domain.StoryView{StoryID: storyID, ViewerID: viewerID})
}

func (uc *StoryUseCase) ReportStory(ctx context.Context, reporterID, storyID string, reason domain.StoryReportReason) error {
	story, err := uc.storyRepo.GetByID(ctx, storyID)
	if err != nil {
		return err
	}
	if story == nil || time.Now().After(story.ExpiresAt) {
		return apperrors.ErrNotFound
	}
	if story.AuthorUserID == reporterID {
		return apperrors.New("INVALID_REPORT", "Нельзя пожаловаться на собственную сторис", http.StatusBadRequest)
	}
	err = uc.storyRepo.CreateReport(ctx, &domain.StoryReport{
		StoryID:    storyID,
		AuthorID:   story.AuthorUserID,
		ReporterID: reporterID,
		Reason:     reason,
		Status:     "open",
	})
	if err != nil {
		return apperrors.New("REPORT_ALREADY_EXISTS", "Вы уже пожаловались на эту сторис", http.StatusConflict)
	}
	return nil
}

func (uc *StoryUseCase) Follow(ctx context.Context, followerID, followedID string) error {
	if followerID == followedID {
		return apperrors.New("INVALID_SUBSCRIPTION", "Нельзя подписаться на себя", http.StatusBadRequest)
	}
	if _, err := uc.storyRepo.GetAuthor(ctx, followedID); err != nil {
		return apperrors.New("PROFESSIONAL_NOT_FOUND", "Профиль мастера или бизнеса не найден", http.StatusNotFound)
	}
	return uc.subscriptionRepo.Create(ctx, &domain.Subscription{FollowerUserID: followerID, FollowedUserID: followedID})
}

func (uc *StoryUseCase) Unfollow(ctx context.Context, followerID, followedID string) error {
	return uc.subscriptionRepo.Delete(ctx, followerID, followedID)
}

func (uc *StoryUseCase) IsFollowing(ctx context.Context, followerID, followedID string) (bool, error) {
	return uc.subscriptionRepo.Exists(ctx, followerID, followedID)
}

func (uc *StoryUseCase) GetSubscriptionStats(ctx context.Context, userID string) (*domain.SubscriptionStatsResponse, error) {
	followingCount, err := uc.subscriptionRepo.CountFollowing(ctx, userID)
	if err != nil {
		return nil, err
	}
	followersCount, err := uc.subscriptionRepo.CountFollowers(ctx, userID)
	if err != nil {
		return nil, err
	}
	following, err := uc.subscriptionRepo.ListFollowing(ctx, userID)
	if err != nil {
		return nil, err
	}
	followers, err := uc.subscriptionRepo.ListFollowers(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &domain.SubscriptionStatsResponse{
		FollowingCount: followingCount,
		FollowersCount: followersCount,
		Following:      following,
		Followers:      followers,
	}, nil
}

func (uc *StoryUseCase) ListReports(ctx context.Context, limit, offset int) ([]*domain.StoryReportResponse, error) {
	reports, err := uc.storyRepo.ListReports(ctx, limit, offset)
	if err != nil {
		return nil, err
	}
	result := make([]*domain.StoryReportResponse, 0, len(reports))
	for _, report := range reports {
		author, authorErr := uc.storyRepo.GetAuthor(ctx, report.AuthorID)
		if authorErr != nil {
			author = &domain.StoryAuthorResponse{UserID: report.AuthorID, DisplayName: "Удалённый профиль"}
		}
		result = append(result, &domain.StoryReportResponse{
			ID: report.ID, StoryID: report.StoryID, AuthorID: report.AuthorID,
			ReporterID: report.ReporterID, Author: *author, Reason: report.Reason,
			Status: report.Status, CreatedAt: report.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	return result, nil
}

func (uc *StoryUseCase) CleanupExpiredStories(ctx context.Context) error {
	stories, err := uc.storyRepo.ListExpired(ctx, time.Now())
	if err != nil {
		return err
	}
	for _, story := range stories {
		uc.storyLog.Printf("%s", storylog.Event("story_cleanup_started", "story", story.ID, "frames", len(story.Frames)))
		purgedAssets := make(map[string]struct{})
		for _, frame := range story.Frames {
			if frame.AssetID != nil {
				if _, alreadyPurged := purgedAssets[*frame.AssetID]; alreadyPurged {
					continue
				}
				if purgeErr := uc.mediaUseCase.PurgeAssetNow(ctx, *frame.AssetID); purgeErr != nil {
					return purgeErr
				}
				purgedAssets[*frame.AssetID] = struct{}{}
			}
		}
		if err := uc.storyRepo.Delete(ctx, story.ID); err != nil {
			return err
		}
		uc.storyLog.Printf("%s", storylog.Event("story_cleanup_done", "story", story.ID))
	}
	return nil
}

func (uc *StoryUseCase) toFeedResponse(ctx context.Context, stories []*domain.Story, viewerID string) (*domain.StoryFeedResponse, error) {
	result := make([]*domain.StoryResponse, 0, len(stories))
	for _, story := range stories {
		response, err := uc.toResponse(ctx, story, viewerID)
		if err != nil {
			return nil, err
		}
		result = append(result, response)
	}
	return &domain.StoryFeedResponse{Stories: result}, nil
}

func (uc *StoryUseCase) toResponse(ctx context.Context, story *domain.Story, viewerID string) (*domain.StoryResponse, error) {
	author, err := uc.storyRepo.GetAuthor(ctx, story.AuthorUserID)
	if err != nil {
		return nil, err
	}
	if author.IsPrivateMaster && author.AvatarURL == nil {
		assets, assetErr := uc.mediaUseCase.GetAssetsByEntity(
			ctx,
			viewerID,
			string(domain.MediaEntityAccount),
			author.UserID,
		)
		if assetErr != nil {
			return nil, assetErr
		}
		for _, asset := range assets.Assets {
			if asset.Category == domain.MediaCategoryAvatar &&
				asset.Status == domain.MediaStatusReady &&
				asset.URLs != nil && asset.URLs.Original != "" {
				avatarURL := asset.URLs.Original
				author.AvatarURL = &avatarURL
				break
			}
		}
	}
	frames := make([]domain.StoryFrameResponse, 0, len(story.Frames))
	for _, frame := range story.Frames {
		item := domain.StoryFrameResponse{
			ID: frame.ID, Position: frame.Position, Kind: frame.Kind, AssetID: frame.AssetID,
			Text: frame.Text, Background: frame.Background, FontSize: frame.FontSize,
			ImageFit: frame.ImageFit, ImageScale: frame.ImageScale, ImageX: frame.ImageX, ImageY: frame.ImageY,
			TextX: frame.TextX, TextY: frame.TextY,
			VideoStart: frame.VideoStart, VideoEnd: frame.VideoEnd,
		}
		if frame.AssetID != nil {
			asset, assetErr := uc.mediaUseCase.GetPublicAsset(ctx, *frame.AssetID)
			if assetErr != nil || asset == nil || asset.URLs == nil {
				continue
			}
			if frame.Kind == domain.StoryFrameVideo {
				item.VideoURL = asset.URLs.Original
			} else {
				item.ImageURL = asset.URLs.Original
			}
			if item.ImageURL == "" && asset.URLs.Large != nil {
				item.ImageURL = asset.URLs.Large.JPEG
				if item.ImageURL == "" {
					item.ImageURL = asset.URLs.Large.WebP
				}
			}
		}
		frames = append(frames, item)
	}
	viewed := false
	if viewerID != "" {
		viewed, err = uc.storyRepo.HasViewed(ctx, story.ID, viewerID)
		if err != nil {
			return nil, err
		}
	}
	viewCount := 0
	if counter, ok := uc.storyRepo.(interface {
		CountViews(context.Context, string) (int, error)
	}); ok {
		viewCount, err = counter.CountViews(ctx, story.ID)
		if err != nil {
			return nil, err
		}
	}
	return &domain.StoryResponse{
		ID: story.ID, Author: *author, Frames: frames,
		ExpiresAt: story.ExpiresAt.UTC().Format(time.RFC3339),
		CreatedAt: story.CreatedAt.UTC().Format(time.RFC3339), IsViewed: viewed, ViewCount: viewCount,
	}, nil
}

func normalizeStoryBackground(background string) string {
	background = strings.ToLower(strings.TrimSpace(background))
	if _, ok := storyBackgrounds[background]; ok {
		return background
	}
	return "#1d4ed8"
}

func normalizeStoryImageFit(fit string) string {
	if fit == "cover" {
		return "cover"
	}
	return "contain"
}

func boundedStoryNumber(value, min, max, fallback float64) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return fallback
	}
	return math.Max(min, math.Min(max, value))
}

func normalizeStoryFontSize(size int) int {
	switch size {
	case 20, 28, 36:
		return size
	default:
		return 28
	}
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
