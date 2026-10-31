package domain

import "time"

type StoryFrameKind string

const (
	StoryFrameText  StoryFrameKind = "text"
	StoryFrameImage StoryFrameKind = "image"
	StoryFrameVideo StoryFrameKind = "video"
)

type StoryReportReason string

const (
	StoryReportSpam     StoryReportReason = "spam"
	StoryReportAbuse    StoryReportReason = "abuse"
	StoryReportInapprop StoryReportReason = "inappropriate"
	StoryReportOther    StoryReportReason = "other"
)

// Story is a 24-hour publication by a professional account.
type Story struct {
	ID           string       `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	AuthorUserID string       `gorm:"type:uuid;not null;index" json:"authorUserId"`
	Frames       []StoryFrame `gorm:"foreignKey:StoryID;constraint:OnDelete:CASCADE" json:"frames,omitempty"`
	ExpiresAt    time.Time    `gorm:"type:timestamptz;not null;index" json:"expiresAt"`
	CreatedAt    time.Time    `gorm:"autoCreateTime:milli" json:"createdAt"`
}

// StoryHighlight is a permanent collection of stories selected by a professional.
// Stories referenced by a highlight are intentionally retained after their 24h TTL.
type StoryHighlight struct {
	ID           string                `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	AuthorUserID string                `gorm:"type:uuid;not null;index" json:"authorUserId"`
	Title        string                `gorm:"type:varchar(48);not null" json:"title"`
	Position     int                   `gorm:"not null;default:0" json:"position"`
	Stories      []StoryHighlightStory `gorm:"foreignKey:HighlightID;constraint:OnDelete:CASCADE" json:"stories,omitempty"`
	CreatedAt    time.Time             `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt    time.Time             `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

type StoryHighlightStory struct {
	ID          string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	HighlightID string    `gorm:"type:uuid;not null;uniqueIndex:idx_story_highlight_story;index" json:"highlightId"`
	StoryID     string    `gorm:"type:uuid;not null;uniqueIndex:idx_story_highlight_story;index" json:"storyId"`
	Position    int       `gorm:"not null;default:0" json:"position"`
	Story       *Story    `gorm:"foreignKey:StoryID" json:"story,omitempty"`
	CreatedAt   time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

type StoryFrame struct {
	ID         string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	StoryID    string         `gorm:"type:uuid;not null;index" json:"storyId"`
	Position   int            `gorm:"not null" json:"position"`
	Kind       StoryFrameKind `gorm:"type:varchar(10);not null" json:"kind"`
	AssetID    *string        `gorm:"type:uuid" json:"assetId,omitempty"`
	Text       *string        `gorm:"type:text" json:"text,omitempty"`
	Background string         `gorm:"type:varchar(32);not null;default:'#1d4ed8'" json:"background"`
	FontSize   int            `gorm:"not null;default:28" json:"fontSize"`
	ImageFit   string         `gorm:"type:varchar(10);not null;default:'contain'" json:"imageFit"`
	ImageScale float64        `gorm:"not null;default:1" json:"imageScale"`
	ImageX     float64        `gorm:"not null;default:0" json:"imageX"`
	ImageY     float64        `gorm:"not null;default:0" json:"imageY"`
	TextX      float64        `gorm:"not null;default:0" json:"textX"`
	TextY      float64        `gorm:"not null;default:0" json:"textY"`
	VideoStart float64        `gorm:"not null;default:0" json:"videoStart,omitempty"`
	VideoEnd   float64        `gorm:"not null;default:0" json:"videoEnd,omitempty"`
	CreatedAt  time.Time      `gorm:"autoCreateTime:milli" json:"createdAt"`
}

type Subscription struct {
	ID             string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	FollowerUserID string    `gorm:"type:uuid;not null;uniqueIndex:idx_subscription_pair" json:"followerUserId"`
	FollowedUserID string    `gorm:"type:uuid;not null;uniqueIndex:idx_subscription_pair;index" json:"followedUserId"`
	CreatedAt      time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

type SubscriptionStatsResponse struct {
	FollowingCount int64                 `json:"followingCount"`
	FollowersCount int64                 `json:"followersCount"`
	Following      []SubscriptionProfile `json:"following"`
	Followers      []SubscriptionProfile `json:"followers"`
}

type SubscriptionProfile struct {
	ID             string   `json:"id"`
	DisplayName    string   `json:"displayName"`
	Role           UserRole `json:"role"`
	IsProfessional bool     `json:"isProfessional"`
}

type StoryView struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	StoryID   string    `gorm:"type:uuid;not null;uniqueIndex:idx_story_view_pair" json:"storyId"`
	ViewerID  string    `gorm:"type:uuid;not null;uniqueIndex:idx_story_view_pair;index" json:"viewerId"`
	CreatedAt time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

type StoryReport struct {
	ID         string            `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	StoryID    string            `gorm:"type:uuid;not null;uniqueIndex:idx_story_report_pair;index" json:"storyId"`
	AuthorID   string            `gorm:"type:uuid;not null;index" json:"authorId"`
	ReporterID string            `gorm:"type:uuid;not null;uniqueIndex:idx_story_report_pair;index" json:"reporterId"`
	Reason     StoryReportReason `gorm:"type:varchar(32);not null" json:"reason"`
	Status     string            `gorm:"type:varchar(20);not null;default:'open';index" json:"status"`
	CreatedAt  time.Time         `gorm:"autoCreateTime:milli" json:"createdAt"`
}

type StoryAuthorResponse struct {
	UserID      string   `json:"userId"`
	DisplayName string   `json:"displayName"`
	Role        UserRole `json:"role"`
	// IsPrivateMaster lets the story use the master's professional avatar.
	// It is an internal flag and is intentionally not exposed to clients.
	IsPrivateMaster bool `json:"-"`
	// AvatarURL is the public professional profile image. For business
	// accounts this is the configured cover image; the client may fall back to
	// the account avatar when a professional image is not configured.
	AvatarURL *string `json:"avatarUrl,omitempty"`
}

type StoryFrameResponse struct {
	ID         string         `json:"id"`
	Position   int            `json:"position"`
	Kind       StoryFrameKind `json:"kind"`
	AssetID    *string        `json:"assetId,omitempty"`
	ImageURL   string         `json:"imageUrl,omitempty"`
	Text       *string        `json:"text,omitempty"`
	Background string         `json:"background"`
	FontSize   int            `json:"fontSize"`
	ImageFit   string         `json:"imageFit"`
	ImageScale float64        `json:"imageScale"`
	ImageX     float64        `json:"imageX"`
	ImageY     float64        `json:"imageY"`
	TextX      float64        `json:"textX"`
	TextY      float64        `json:"textY"`
	VideoURL   string         `json:"videoUrl,omitempty"`
	VideoStart float64        `json:"videoStart,omitempty"`
	VideoEnd   float64        `json:"videoEnd,omitempty"`
}

type StoryResponse struct {
	ID        string               `json:"id"`
	Author    StoryAuthorResponse  `json:"author"`
	Frames    []StoryFrameResponse `json:"frames"`
	ExpiresAt string               `json:"expiresAt"`
	CreatedAt string               `json:"createdAt"`
	IsViewed  bool                 `json:"isViewed"`
	ViewCount int                  `json:"viewCount"`
}

type StoryFeedResponse struct {
	Stories []*StoryResponse `json:"stories"`
}

type StoryHighlightResponse struct {
	ID        string              `json:"id"`
	Title     string              `json:"title"`
	Author    StoryAuthorResponse `json:"author"`
	Stories   []*StoryResponse    `json:"stories"`
	CreatedAt string              `json:"createdAt"`
}

type CreateStoryRequest struct {
	Frames []CreateStoryFrameRequest `json:"frames" validate:"required,min=1,max=10"`
}

type CreateStoryFrameRequest struct {
	Kind       StoryFrameKind `json:"kind" validate:"required,oneof=text image video"`
	AssetID    *string        `json:"assetId,omitempty"`
	Text       *string        `json:"text,omitempty"`
	Background string         `json:"background,omitempty"`
	FontSize   int            `json:"fontSize,omitempty"`
	ImageFit   string         `json:"imageFit,omitempty"`
	ImageScale float64        `json:"imageScale,omitempty"`
	ImageX     float64        `json:"imageX,omitempty"`
	ImageY     float64        `json:"imageY,omitempty"`
	TextX      float64        `json:"textX,omitempty"`
	TextY      float64        `json:"textY,omitempty"`
	VideoStart float64        `json:"videoStart,omitempty"`
	VideoEnd   float64        `json:"videoEnd,omitempty"`
}

type CreateStoryReportRequest struct {
	Reason StoryReportReason `json:"reason" validate:"required,oneof=spam abuse inappropriate other"`
}

type StoryReportResponse struct {
	ID         string              `json:"id"`
	StoryID    string              `json:"storyId"`
	AuthorID   string              `json:"authorId"`
	ReporterID string              `json:"reporterId"`
	Author     StoryAuthorResponse `json:"author"`
	Reason     StoryReportReason   `json:"reason"`
	Status     string              `json:"status"`
	CreatedAt  string              `json:"createdAt"`
}
