package repository

import (
	"context"
	"errors"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
)

type storyRepositoryImpl struct {
	db *gorm.DB
}

func NewStoryRepository(db *gorm.DB) StoryRepository {
	return &storyRepositoryImpl{db: db}
}

func (r *storyRepositoryImpl) Create(ctx context.Context, story *domain.Story) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Save the story first without GORM's automatic association handling.
		// Frames are inserted explicitly below so each frame is persisted once.
		if err := tx.Omit("Frames").Create(story).Error; err != nil {
			return err
		}
		for i := range story.Frames {
			story.Frames[i].StoryID = story.ID
			if err := tx.Create(&story.Frames[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *storyRepositoryImpl) GetByID(ctx context.Context, id string) (*domain.Story, error) {
	var story domain.Story
	err := r.db.WithContext(ctx).
		Preload("Frames", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Where("id = ?", id).
		First(&story).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &story, err
}

func (r *storyRepositoryImpl) ListActiveByAuthor(ctx context.Context, authorID string) ([]*domain.Story, error) {
	return r.listActive(ctx, []string{authorID})
}

func (r *storyRepositoryImpl) ListActiveByAuthors(ctx context.Context, authorIDs []string) ([]*domain.Story, error) {
	if len(authorIDs) == 0 {
		return []*domain.Story{}, nil
	}
	return r.listActive(ctx, authorIDs)
}

func (r *storyRepositoryImpl) ListActive(ctx context.Context) ([]*domain.Story, error) {
	var stories []*domain.Story
	err := r.db.WithContext(ctx).
		Preload("Frames", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Where("expires_at > ?", time.Now()).
		Order("created_at ASC").
		Find(&stories).Error
	return stories, err
}

func (r *storyRepositoryImpl) listActive(ctx context.Context, authorIDs []string) ([]*domain.Story, error) {
	var stories []*domain.Story
	err := r.db.WithContext(ctx).
		Preload("Frames", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Where("author_user_id IN ? AND expires_at > ?", authorIDs, time.Now()).
		Order("created_at ASC").
		Find(&stories).Error
	return stories, err
}

func (r *storyRepositoryImpl) ListExpired(ctx context.Context, now time.Time) ([]*domain.Story, error) {
	var stories []*domain.Story
	err := r.db.WithContext(ctx).
		Preload("Frames").
		Where("expires_at <= ?", now).
		Where("NOT EXISTS (SELECT 1 FROM story_highlight_stories shs WHERE shs.story_id = stories.id)").
		Find(&stories).Error
	return stories, err
}

func (r *storyRepositoryImpl) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("story_id = ?", id).Delete(&domain.StoryHighlightStory{}).Error; err != nil {
			return err
		}
		if err := tx.Where("story_id = ?", id).Delete(&domain.StoryView{}).Error; err != nil {
			return err
		}
		if err := tx.Where("story_id = ?", id).Delete(&domain.StoryFrame{}).Error; err != nil {
			return err
		}
		return tx.Delete(&domain.Story{}, "id = ?", id).Error
	})
}

func (r *storyRepositoryImpl) GetHighlightByTitle(ctx context.Context, authorID, title string) (*domain.StoryHighlight, error) {
	var highlight domain.StoryHighlight
	err := r.db.WithContext(ctx).
		Where("author_user_id = ? AND title = ?", authorID, title).
		First(&highlight).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &highlight, err
}

func (r *storyRepositoryImpl) GetHighlightByID(ctx context.Context, authorID, highlightID string) (*domain.StoryHighlight, error) {
	var highlight domain.StoryHighlight
	err := r.db.WithContext(ctx).
		Where("id = ? AND author_user_id = ?", highlightID, authorID).
		First(&highlight).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &highlight, err
}

func (r *storyRepositoryImpl) CreateHighlight(ctx context.Context, highlight *domain.StoryHighlight) error {
	return r.db.WithContext(ctx).Create(highlight).Error
}

func (r *storyRepositoryImpl) AddStoryToHighlight(ctx context.Context, item *domain.StoryHighlightStory) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing domain.StoryHighlightStory
		err := tx.Where("highlight_id = ? AND story_id = ?", item.HighlightID, item.StoryID).First(&existing).Error
		if err == nil {
			item.ID = existing.ID
			item.Position = existing.Position
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		var lastPosition int
		if err := tx.Model(&domain.StoryHighlightStory{}).
			Where("highlight_id = ?", item.HighlightID).
			Select("COALESCE(MAX(position), -1)").Scan(&lastPosition).Error; err != nil {
			return err
		}
		item.Position = lastPosition + 1
		return tx.Create(item).Error
	})
}

func (r *storyRepositoryImpl) RemoveStoryFromHighlight(ctx context.Context, highlightID, storyID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var item domain.StoryHighlightStory
		if err := tx.Where("highlight_id = ? AND story_id = ?", highlightID, storyID).
			First(&item).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}

		if err := tx.Delete(&item).Error; err != nil {
			return err
		}
		return tx.Model(&domain.StoryHighlightStory{}).
			Where("highlight_id = ? AND position > ?", highlightID, item.Position).
			UpdateColumn("position", gorm.Expr("position - 1")).Error
	})
}

func (r *storyRepositoryImpl) ListHighlightsByAuthor(ctx context.Context, authorID string) ([]*domain.StoryHighlight, error) {
	var highlights []*domain.StoryHighlight
	err := r.db.WithContext(ctx).
		Preload("Stories", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Preload("Stories.Story", func(db *gorm.DB) *gorm.DB {
			return db.Preload("Frames", func(frameDB *gorm.DB) *gorm.DB { return frameDB.Order("position ASC") })
		}).
		Where("author_user_id = ?", authorID).
		Order("position ASC, created_at ASC").
		Find(&highlights).Error
	return highlights, err
}

func (r *storyRepositoryImpl) RecordView(ctx context.Context, view *domain.StoryView) error {
	return r.db.WithContext(ctx).Where("story_id = ? AND viewer_id = ?", view.StoryID, view.ViewerID).FirstOrCreate(view).Error
}

func (r *storyRepositoryImpl) CountViews(ctx context.Context, storyID string) (int, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&domain.StoryView{}).
		Where("story_id = ? AND viewer_id <> (SELECT author_user_id FROM stories WHERE id = ?)", storyID, storyID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *storyRepositoryImpl) HasViewed(ctx context.Context, storyID, viewerID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.StoryView{}).
		Where("story_id = ? AND viewer_id = ?", storyID, viewerID).Count(&count).Error
	return count > 0, err
}

func (r *storyRepositoryImpl) CreateReport(ctx context.Context, report *domain.StoryReport) error {
	return r.db.WithContext(ctx).Create(report).Error
}

func (r *storyRepositoryImpl) ListReports(ctx context.Context, limit, offset int) ([]*domain.StoryReport, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var reports []*domain.StoryReport
	err := r.db.WithContext(ctx).Order("created_at DESC").Limit(limit).Offset(offset).Find(&reports).Error
	return reports, err
}

// GetAuthor returns the public professional profile identity used by stories.
// A raw query keeps the stories feature independent from the several provider
// profile repositories while still showing the business/master display name.
func (r *storyRepositoryImpl) GetAuthor(ctx context.Context, userID string) (*domain.StoryAuthorResponse, error) {
	var row struct {
		UserID          string
		DisplayName     string
		Role            string
		IsPrivateMaster bool
		AvatarURL       *string
	}
	err := r.db.WithContext(ctx).Raw(`
		SELECT u.id AS user_id,
			COALESCE(NULLIF(m.full_name, ''), NULLIF(aw.full_name, ''),
				NULLIF(ash.full_name, ''), NULLIF(asv.full_name, ''),
				NULLIF(u.name, ''), u.phone) AS display_name,
			u.role,
			COALESCE(NULLIF(aw.cover_image_url, ''),
				NULLIF(ash.cover_image_url, ''),
				NULLIF(asv.cover_image_url, '')) AS avatar_url,
			m.user_id IS NOT NULL AS is_private_master
		FROM users u
		LEFT JOIN masters m ON m.user_id = u.id
		LEFT JOIN auto_washes aw ON aw.user_id = u.id
		LEFT JOIN auto_shops ash ON ash.user_id = u.id
		LEFT JOIN auto_services asv ON asv.user_id = u.id
		WHERE u.id = ?
			-- An account can be both professional and admin. The professional
			-- flag is the source of truth here; the role is used for access
			-- control and must not hide an admin's professional stories.
			AND u.is_professional = TRUE
	`, userID).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.UserID == "" {
		return nil, gorm.ErrRecordNotFound
	}
	return &domain.StoryAuthorResponse{
		UserID:          row.UserID,
		DisplayName:     row.DisplayName,
		Role:            domain.UserRole(row.Role),
		IsPrivateMaster: row.IsPrivateMaster,
		AvatarURL:       row.AvatarURL,
	}, nil
}

type subscriptionRepositoryImpl struct {
	db *gorm.DB
}

func NewSubscriptionRepository(db *gorm.DB) SubscriptionRepository {
	return &subscriptionRepositoryImpl{db: db}
}

func (r *subscriptionRepositoryImpl) Create(ctx context.Context, subscription *domain.Subscription) error {
	return r.db.WithContext(ctx).Where("follower_user_id = ? AND followed_user_id = ?", subscription.FollowerUserID, subscription.FollowedUserID).FirstOrCreate(subscription).Error
}

func (r *subscriptionRepositoryImpl) Delete(ctx context.Context, followerID, followedID string) error {
	return r.db.WithContext(ctx).Where("follower_user_id = ? AND followed_user_id = ?", followerID, followedID).Delete(&domain.Subscription{}).Error
}

func (r *subscriptionRepositoryImpl) Exists(ctx context.Context, followerID, followedID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Subscription{}).
		Where("follower_user_id = ? AND followed_user_id = ?", followerID, followedID).Count(&count).Error
	return count > 0, err
}

func (r *subscriptionRepositoryImpl) ListFollowedIDs(ctx context.Context, followerID string) ([]string, error) {
	var ids []string
	err := r.db.WithContext(ctx).Model(&domain.Subscription{}).
		Where("follower_user_id = ?", followerID).
		Order("created_at ASC").Pluck("followed_user_id", &ids).Error
	return ids, err
}

func (r *subscriptionRepositoryImpl) CountFollowing(ctx context.Context, followerID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Subscription{}).
		Where("follower_user_id = ?", followerID).
		Count(&count).Error
	return count, err
}

func (r *subscriptionRepositoryImpl) CountFollowers(ctx context.Context, followedID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.Subscription{}).
		Where("followed_user_id = ?", followedID).
		Count(&count).Error
	return count, err
}

func (r *subscriptionRepositoryImpl) ListFollowing(ctx context.Context, followerID string) ([]domain.SubscriptionProfile, error) {
	return r.listSubscriptionProfiles(ctx, "s.followed_user_id", "s.follower_user_id", followerID)
}

func (r *subscriptionRepositoryImpl) ListFollowers(ctx context.Context, followedID string) ([]domain.SubscriptionProfile, error) {
	return r.listSubscriptionProfiles(ctx, "s.follower_user_id", "s.followed_user_id", followedID)
}

func (r *subscriptionRepositoryImpl) listSubscriptionProfiles(
	ctx context.Context,
	profileUserColumn string,
	filterColumn string,
	userID string,
) ([]domain.SubscriptionProfile, error) {
	profiles := make([]domain.SubscriptionProfile, 0)
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			u.id,
			COALESCE(
				NULLIF(m.full_name, ''),
				NULLIF(aw.full_name, ''),
				NULLIF(ash.full_name, ''),
				NULLIF(asv.full_name, ''),
				NULLIF(u.name, ''),
				u.phone
			) AS display_name,
			u.role,
			u.is_professional
		FROM subscriptions s
		JOIN users u ON u.id = `+profileUserColumn+`
		LEFT JOIN masters m ON m.user_id = u.id
		LEFT JOIN auto_washes aw ON aw.user_id = u.id
		LEFT JOIN auto_shops ash ON ash.user_id = u.id
		LEFT JOIN auto_services asv ON asv.user_id = u.id
		WHERE `+filterColumn+` = ?
		ORDER BY s.created_at ASC
	`, userID).Scan(&profiles).Error
	return profiles, err
}
