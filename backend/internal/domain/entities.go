package domain

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/lib/pq"
)

type UserRole string

const (
	RoleCustomer    UserRole = "customer"
	RoleMaster      UserRole = "master"
	RoleAutoWash    UserRole = "auto_wash"
	RoleAutoShop    UserRole = "auto_shop"
	RoleAutoService UserRole = "auto_service"
	RoleModerator   UserRole = "moderator"
	RoleAdmin       UserRole = "admin"
)

// Point represents a geographic point
type Point struct {
	Type        string     `json:"type"`
	Coordinates [2]float64 `json:"coordinates"`
}

// UnmarshalJSON supports both payload formats:
// 1) GeoJSON-like: {"type":"Point","coordinates":[lng,lat]}
// 2) Frontend shorthand: {"x":lat,"y":lng}
func (p *Point) UnmarshalJSON(data []byte) error {
	type geoPoint struct {
		Type        string    `json:"type"`
		Coordinates []float64 `json:"coordinates"`
		X           *float64  `json:"x"`
		Y           *float64  `json:"y"`
	}

	var raw geoPoint
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	// Frontend shorthand has priority when present.
	if raw.X != nil && raw.Y != nil {
		p.Type = "Point"
		// Store as [lng, lat]
		p.Coordinates = [2]float64{*raw.Y, *raw.X}
		return nil
	}

	if len(raw.Coordinates) >= 2 {
		p.Type = raw.Type
		if p.Type == "" {
			p.Type = "Point"
		}
		p.Coordinates = [2]float64{raw.Coordinates[0], raw.Coordinates[1]}
		return nil
	}

	// Keep explicit zero point when object exists but coordinates are not provided.
	p.Type = raw.Type
	if p.Type == "" {
		p.Type = "Point"
	}
	p.Coordinates = [2]float64{0, 0}
	return nil
}

func (p Point) Value() (driver.Value, error) {
	return json.Marshal(p)
}

func (p *Point) Scan(value interface{}) error {
	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, p)
	case string:
		return json.Unmarshal([]byte(v), p)
	default:
		return json.Unmarshal([]byte("{}"), p)
	}
}

// User represents a user entity
type User struct {
	ID              string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Phone           string     `gorm:"uniqueIndex;not null" json:"phone"`
	Password        string     `gorm:"not null" json:"-"`
	Name            *string    `gorm:"type:varchar(255)" json:"name,omitempty"`
	ContactNumber   *string    `gorm:"type:varchar(20)" json:"contactNumber,omitempty"`
	Role            UserRole   `gorm:"type:varchar(20);default:'customer'" json:"role"`
	IsProfessional  bool       `gorm:"default:false" json:"isProfessional"`
	AgreedToPrivacy bool       `gorm:"default:false;not null" json:"agreedToPrivacy"`
	PrivacyAgreedAt *time.Time `gorm:"type:timestamp" json:"privacyAgreedAt,omitempty"`
	Coordinates     *Point     `gorm:"type:jsonb" json:"coordinates,omitempty"`
	CreatedAt       time.Time  `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt       time.Time  `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// Master represents a master profile
type Master struct {
	ID                   string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID               string         `gorm:"not null;uniqueIndex" json:"userId"`
	User                 *User          `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	FullName             *string        `gorm:"type:varchar(255)" json:"fullName,omitempty"`
	WorkingPhone         *string        `gorm:"type:varchar(20)" json:"workingPhone,omitempty"`
	Description          *string        `gorm:"type:text" json:"description,omitempty"`
	Address              *string        `gorm:"type:text" json:"address,omitempty"`
	Coordinates          *Point         `gorm:"type:jsonb" json:"coordinates,omitempty"`
	CoverImageAssetID    *string        `gorm:"type:uuid" json:"coverImageAssetId,omitempty"`
	Status               string         `gorm:"type:varchar(20);default:'schedule'" json:"status"`
	CurrentStatus        string         `gorm:"type:varchar(20);default:'unavailable'" json:"currentStatus"`
	OnlineBookingEnabled bool           `gorm:"default:false;not null" json:"onlineBookingEnabled"`
	LiveQueueEnabled     bool           `gorm:"default:false;not null" json:"liveQueueEnabled"`
	Rating               float32        `gorm:"default:0" json:"rating"`
	ReviewsCount         int            `gorm:"default:0" json:"reviewsCount"`
	WorkFrom             *string        `gorm:"type:varchar(5)" json:"workFrom,omitempty"`
	WorkTo               *string        `gorm:"type:varchar(5)" json:"workTo,omitempty"`
	WorkingDays          pq.StringArray `gorm:"type:text[]" json:"workingDays,omitempty"`
	Professions          pq.StringArray `gorm:"type:text[]" json:"professions,omitempty"`
	Services             pq.StringArray `gorm:"type:text[]" json:"services,omitempty"`
	AutoMarks            pq.StringArray `gorm:"type:text[]" json:"autoMarks,omitempty"`
	Payments             pq.StringArray `gorm:"type:text[]" json:"payments,omitempty"`
	HasParking           bool           `gorm:"default:false;not null" json:"hasParking"`
	HasWifi              bool           `gorm:"default:false;not null" json:"hasWifi"`
	HasWaitingArea       bool           `gorm:"default:false;not null" json:"hasWaitingArea"`
	OffersCoffee         bool           `gorm:"default:false;not null" json:"offersCoffee"`
	HasEvacuation        bool           `gorm:"default:false;not null" json:"hasEvacuation"`
	HasPartsInStock      bool           `gorm:"default:false;not null" json:"hasPartsInStock"`
	LiftCount            int            `gorm:"default:0;not null" json:"liftCount"`
	ActivitySubtypeID    *string        `gorm:"type:uuid;index" json:"activitySubtypeId,omitempty"`
	CreatedAt            time.Time      `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt            time.Time      `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// Order represents an order/request
type Order struct {
	ID             string               `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	CustomerID     string               `gorm:"not null;index" json:"customerId"`
	Customer       *User                `gorm:"foreignKey:CustomerID;constraint:OnDelete:CASCADE" json:"customer,omitempty"`
	ProviderID     *string              `gorm:"index" json:"providerId,omitempty"`
	Provider       *User                `gorm:"foreignKey:ProviderID;constraint:OnDelete:SET NULL" json:"provider,omitempty"`
	ActivityTypeID string               `gorm:"not null" json:"activityTypeId"`
	ActivityType   *ActivityType        `gorm:"foreignKey:ActivityTypeID;constraint:OnDelete:CASCADE" json:"activityType,omitempty"`
	Name           string               `gorm:"type:varchar(255);not null;default:''" json:"name"`
	CarBrand       string               `gorm:"type:varchar(255);not null;default:''" json:"carBrand"`
	Description    string               `gorm:"type:text" json:"description"`
	TimePreference *OrderTimePreference `gorm:"type:varchar(32)" json:"timePreference,omitempty"`
	Phone          string               `gorm:"type:varchar(20);not null;default:''" json:"phone"`
	PhotoAssetIDs  pq.StringArray       `gorm:"type:text[]" json:"photoAssetIds,omitempty"`
	Price          *float32             `gorm:"type:decimal(10,2)" json:"price,omitempty"`
	ConfirmedAt    *time.Time           `gorm:"type:timestamptz" json:"confirmedDateTime,omitempty"`
	CancelReason   *string              `gorm:"type:text" json:"cancelReason,omitempty"`
	ChatID         *string              `gorm:"type:uuid;index" json:"chatId,omitempty"`
	Status         OrderStatus          `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt      time.Time            `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt      time.Time            `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

type OrderTimePreference string

const (
	OrderTimePreferenceUrgent    OrderTimePreference = "urgent"
	OrderTimePreferenceNotUrgent OrderTimePreference = "not_urgent"
)

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusScheduled OrderStatus = "scheduled"
	OrderStatusCompleted OrderStatus = "completed"
	OrderStatusCancelled OrderStatus = "cancelled"
)

type ChatMessageStatus string

const (
	ChatMessageStatusSent      ChatMessageStatus = "sent"
	ChatMessageStatusDelivered ChatMessageStatus = "delivered"
	ChatMessageStatusRead      ChatMessageStatus = "read"
)

type ChatMessage struct {
	ID        string            `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	OrderID   string            `gorm:"not null;index" json:"orderId"`
	Order     *Order            `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"order,omitempty"`
	SenderID  string            `gorm:"not null;index" json:"senderId"`
	Sender    *User             `gorm:"foreignKey:SenderID;constraint:OnDelete:CASCADE" json:"sender,omitempty"`
	Message   string            `gorm:"type:text;not null" json:"message"`
	Status    ChatMessageStatus `gorm:"type:varchar(20);default:'sent'" json:"status"`
	CreatedAt time.Time         `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt time.Time         `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// ActivityType represents a type of activity
type ActivityType struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"uniqueIndex;not null;type:varchar(255)" json:"name"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt time.Time `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// UserActivityType represents a many-to-many relationship between users and activity types
type UserActivityType struct {
	ID             string        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID         string        `gorm:"not null;index" json:"userId"`
	User           *User         `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	ActivityTypeID string        `gorm:"not null;index" json:"activityTypeId"`
	ActivityType   *ActivityType `gorm:"foreignKey:ActivityTypeID;constraint:OnDelete:CASCADE" json:"activityType,omitempty"`
	CreatedAt      time.Time     `gorm:"autoCreateTime:milli" json:"createdAt"`
}

// Review represents a review/rating
type Review struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	FromID    string         `gorm:"not null;index" json:"fromId"`
	From      *User          `gorm:"foreignKey:FromID;constraint:OnDelete:CASCADE" json:"from,omitempty"`
	ToID      string         `gorm:"not null;index" json:"toId"`
	To        *User          `gorm:"foreignKey:ToID;constraint:OnDelete:CASCADE" json:"to,omitempty"`
	OrderID   *string        `gorm:"type:uuid;index" json:"orderId,omitempty"`
	Order     *Order         `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"order,omitempty"`
	Rating    int            `gorm:"not null;check:rating >= 1 AND rating <= 5" json:"rating"`
	Comment   string         `gorm:"type:text" json:"comment"`
	Tags      pq.StringArray `gorm:"type:text[]" json:"tags,omitempty"`
	CreatedAt time.Time      `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// AutoWash represents an auto wash service provider
type AutoWash struct {
	ID                   string                `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID               string                `gorm:"not null;uniqueIndex" json:"userId"`
	User                 *User                 `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	FullName             *string               `gorm:"type:varchar(255)" json:"fullName,omitempty"`
	WorkingPhone         *string               `gorm:"type:varchar(20)" json:"workingPhone,omitempty"`
	Description          *string               `gorm:"type:text" json:"description,omitempty"`
	Address              *string               `gorm:"type:text" json:"address,omitempty"`
	Coordinates          *Point                `gorm:"type:jsonb" json:"coordinates,omitempty"`
	CoverImageURL        *string               `gorm:"type:text" json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string               `gorm:"type:uuid" json:"coverImageAssetId,omitempty"`
	Status               string                `gorm:"type:varchar(20);default:'schedule'" json:"status"`
	Rating               float32               `gorm:"default:0" json:"rating"`
	ReviewsCount         int                   `gorm:"default:0" json:"reviewsCount"`
	OnlineBookingEnabled bool                  `gorm:"default:false;not null" json:"onlineBookingEnabled"`
	LiveQueueEnabled     bool                  `gorm:"default:false;not null" json:"liveQueueEnabled"`
	WorkFrom             *string               `gorm:"type:varchar(5)" json:"workFrom,omitempty"`
	WorkTo               *string               `gorm:"type:varchar(5)" json:"workTo,omitempty"`
	WorkingDays          pq.StringArray        `gorm:"type:text[]" json:"workingDays,omitempty"`
	Services             pq.StringArray        `gorm:"type:text[]" json:"services,omitempty"`
	Payments             pq.StringArray        `gorm:"type:text[]" json:"payments,omitempty"`
	ActivitySubtypeID    *string               `gorm:"type:uuid;index" json:"activitySubtypeId,omitempty"`
	ActivitySubtype      *ActivitySubtype      `gorm:"foreignKey:ActivitySubtypeID" json:"activitySubtype,omitempty"`
	BoxCount             *int                  `gorm:"" json:"boxCount,omitempty"`
	WasherCount          *int                  `gorm:"" json:"washerCount,omitempty"`
	HasWaitingArea       bool                  `gorm:"default:false;not null" json:"hasWaitingArea"`
	CreatedAt            time.Time             `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt            time.Time             `gorm:"autoUpdateTime:milli" json:"updatedAt"`
	AdditionalAWServices []AdditionalAWService `json:"additionalAWServices,omitempty"`
}

type AdditionalAWService struct {
	ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	AutoWashID string    `gorm:"not null;index" json:"autoWashId"`
	Name       string    `gorm:"not null" json:"name"`
	Price      float32   `gorm:"type:decimal(10,2)" json:"price"`
	CreatedAt  time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

// AutoShop represents an auto shop
type AutoShop struct {
	ID                   string                `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID               string                `gorm:"not null;uniqueIndex" json:"userId"`
	User                 *User                 `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	FullName             *string               `gorm:"type:varchar(255)" json:"fullName,omitempty"`
	WorkingPhone         *string               `gorm:"type:varchar(20)" json:"workingPhone,omitempty"`
	Description          *string               `gorm:"type:text" json:"description,omitempty"`
	Address              *string               `gorm:"type:text" json:"address,omitempty"`
	Coordinates          *Point                `gorm:"type:jsonb" json:"coordinates,omitempty"`
	CoverImageURL        *string               `gorm:"type:text" json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string               `gorm:"type:uuid" json:"coverImageAssetId,omitempty"`
	Status               string                `gorm:"type:varchar(20);default:'schedule'" json:"status"`
	Rating               float32               `gorm:"default:0" json:"rating"`
	ReviewsCount         int                   `gorm:"default:0" json:"reviewsCount"`
	OnlineBookingEnabled bool                  `gorm:"default:false;not null" json:"onlineBookingEnabled"`
	WorkFrom             *string               `gorm:"type:varchar(5)" json:"workFrom,omitempty"`
	WorkTo               *string               `gorm:"type:varchar(5)" json:"workTo,omitempty"`
	WorkingDays          pq.StringArray        `gorm:"type:text[]" json:"workingDays,omitempty"`
	Services             pq.StringArray        `gorm:"type:text[]" json:"services,omitempty"`
	Payments             pq.StringArray        `gorm:"type:text[]" json:"payments,omitempty"`
	Brands               pq.StringArray        `gorm:"type:text[]" json:"brands,omitempty"`
	ProductCategories    pq.StringArray        `gorm:"type:text[]" json:"productCategories,omitempty"`
	CreatedAt            time.Time             `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt            time.Time             `gorm:"autoUpdateTime:milli" json:"updatedAt"`
	AdditionalASServices []AdditionalASService `json:"additionalASServices,omitempty"`
}

type AdditionalASService struct {
	ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	AutoShopID string    `gorm:"not null;index" json:"autoShopId"`
	Name       string    `gorm:"not null" json:"name"`
	Price      float32   `gorm:"type:decimal(10,2)" json:"price"`
	CreatedAt  time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
}

// BusinessApplicationStatus represents the lifecycle state of a business application
type BusinessApplicationStatus string

const (
	BusinessApplicationStatusPending       BusinessApplicationStatus = "pending"
	BusinessApplicationStatusApproved      BusinessApplicationStatus = "approved"
	BusinessApplicationStatusRejected      BusinessApplicationStatus = "rejected"
	BusinessApplicationStatusNeedsRevision BusinessApplicationStatus = "needs_revision"
)

// BusinessType represents the type of automotive business
type BusinessType string

const (
	BusinessTypeAutoService BusinessType = "auto_service"
	BusinessTypeAutoWash    BusinessType = "auto_wash"
	BusinessTypeAutoShop    BusinessType = "auto_shop"
	BusinessTypeTireFitting BusinessType = "tire_fitting"
	BusinessTypeDetailing   BusinessType = "detailing"
	BusinessTypeStation     BusinessType = "station"
	BusinessTypeMaster      BusinessType = "master"
	BusinessTypeOther       BusinessType = "other"
)

// BusinessApplication represents an application to activate a professional/business account
type BusinessApplication struct {
	ID                  string                    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID              string                    `gorm:"not null;index" json:"userId"`
	User                *User                     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	BusinessType        BusinessType              `gorm:"type:varchar(32);not null" json:"businessType"`
	ActivityGroupCode   *string                   `gorm:"type:varchar(64);index:idx_business_applications_group_status,priority:1" json:"activityGroupCode,omitempty"`
	ActivitySubtypeCode *string                   `gorm:"type:varchar(64);index:idx_business_applications_subtype_status,priority:1" json:"activitySubtypeCode,omitempty"`
	BusinessName        *string                   `gorm:"type:varchar(255)" json:"businessName,omitempty"`
	ApplicantName       *string                   `gorm:"type:varchar(255)" json:"applicantName,omitempty"`
	City                string                    `gorm:"type:varchar(128);not null" json:"city"`
	Address             *string                   `gorm:"type:text" json:"address,omitempty"`
	Phone               string                    `gorm:"type:varchar(32);not null" json:"phone"`
	YandexMapsURL       *string                   `gorm:"column:yandex_maps_url;type:text" json:"yandexMapsUrl,omitempty"`
	ContactPerson       *string                   `gorm:"type:varchar(255)" json:"contactPerson,omitempty"`
	Email               *string                   `gorm:"type:varchar(255)" json:"email,omitempty"`
	Comment             *string                   `gorm:"type:text" json:"comment,omitempty"`
	AgreedToTerms       bool                      `gorm:"default:false;not null" json:"agreedToTerms"`
	Status              BusinessApplicationStatus `gorm:"type:varchar(32);default:'pending';index;index:idx_business_applications_group_status,priority:2;index:idx_business_applications_subtype_status,priority:2" json:"status"`
	RejectionReason     *string                   `gorm:"type:text" json:"rejectionReason,omitempty"`
	ReviewedAt          *time.Time                `gorm:"type:timestamp" json:"reviewedAt,omitempty"`
	CreatedAt           time.Time                 `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt           time.Time                 `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// AutoService represents an auto service
type AutoService struct {
	ID                   string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID               string         `gorm:"not null;uniqueIndex" json:"userId"`
	User                 *User          `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	FullName             *string        `gorm:"type:varchar(255)" json:"fullName,omitempty"`
	WorkingPhone         *string        `gorm:"type:varchar(20)" json:"workingPhone,omitempty"`
	Description          *string        `gorm:"type:text" json:"description,omitempty"`
	Address              *string        `gorm:"type:text" json:"address,omitempty"`
	Coordinates          *Point         `gorm:"type:jsonb" json:"coordinates,omitempty"`
	CoverImageURL        *string        `gorm:"type:text" json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string        `gorm:"type:uuid" json:"coverImageAssetId,omitempty"`
	Status               string         `gorm:"type:varchar(20);default:'schedule'" json:"status"`
	Rating               float32        `gorm:"default:0" json:"rating"`
	ReviewsCount         int            `gorm:"default:0" json:"reviewsCount"`
	OnlineBookingEnabled bool           `gorm:"default:false;not null" json:"onlineBookingEnabled"`
	LiveQueueEnabled     bool           `gorm:"default:false;not null" json:"liveQueueEnabled"`
	WorkFrom             *string        `gorm:"type:varchar(5)" json:"workFrom,omitempty"`
	WorkTo               *string        `gorm:"type:varchar(5)" json:"workTo,omitempty"`
	WorkingDays          pq.StringArray `gorm:"type:text[]" json:"workingDays,omitempty"`
	Services             pq.StringArray `gorm:"type:text[]" json:"services,omitempty"`
	Payments             pq.StringArray `gorm:"type:text[]" json:"payments,omitempty"`
	Professions          pq.StringArray `gorm:"type:text[]" json:"professions,omitempty"`
	HasParking           bool           `gorm:"default:false" json:"hasParking"`
	LiftCount            int            `gorm:"default:0" json:"liftCount"`
	Warranty             bool           `gorm:"default:false" json:"warranty"`
	Hotline              *string        `gorm:"type:varchar(32)" json:"hotline,omitempty"`
	BrandSupport         pq.StringArray `gorm:"type:text[]" json:"brandSupport,omitempty"`
	ActivitySubtypeID    *string        `gorm:"type:uuid;index" json:"activitySubtypeId,omitempty"`
	CreatedAt            time.Time      `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt            time.Time      `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// ActivityGroup — верхний уровень классификации (auto_wash, auto_service, private_executor).
type ActivityGroup struct {
	ID          string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Code        string    `gorm:"uniqueIndex;not null;type:varchar(64)" json:"code"`
	DisplayName string    `gorm:"not null;type:varchar(128)" json:"displayName"`
	Description *string   `gorm:"type:text" json:"description,omitempty"`
	IsActive    bool      `gorm:"default:true;not null" json:"isActive"`
	SortOrder   int       `gorm:"default:100;not null" json:"sortOrder"`
	CreatedAt   time.Time `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// ActivitySubtype — производный тип (classic, self_service, tire_fitting, master, washer и т.д.).
// Ключевые ограничения: UNIQUE (group_id, code) и UNIQUE (id, group_id) — второй нужен для
// композитного FK из user_activity_profiles, который гарантирует, что subtype принадлежит
// именно той группе, которую указал профиль.
type ActivitySubtype struct {
	ID               string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	GroupID          string         `gorm:"not null;type:uuid;index" json:"groupId"`
	Group            *ActivityGroup `gorm:"foreignKey:GroupID;constraint:OnDelete:RESTRICT" json:"group,omitempty"`
	Code             string         `gorm:"not null;type:varchar(64)" json:"code"`
	DisplayName      string         `gorm:"not null;type:varchar(128)" json:"displayName"`
	Description      *string        `gorm:"type:text" json:"description,omitempty"`
	IsActive         bool           `gorm:"default:true;not null" json:"isActive"`
	SortOrder        int            `gorm:"default:100;not null" json:"sortOrder"`
	CabinetSchemaKey string         `gorm:"not null;type:varchar(128)" json:"cabinetSchemaKey"`
	SettingsSchema   *string        `gorm:"type:jsonb" json:"settingsSchema,omitempty"`
	CreatedAt        time.Time      `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt        time.Time      `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// UserActivityProfile — привязка пользователя к паре (group, subtype). Source of truth
// для того, какие подтипы выбрал провайдер. Композитный FK (subtype_id, group_id) ->
// activity_subtypes(id, group_id) гарантирует консистентность на уровне БД.
type UserActivityProfile struct {
	ID                string           `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID            string           `gorm:"not null;type:uuid;index" json:"userId"`
	User              *User            `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	ActivityGroupID   string           `gorm:"not null;type:uuid;column:activity_group_id" json:"activityGroupId"`
	ActivityGroup     *ActivityGroup   `gorm:"foreignKey:ActivityGroupID;constraint:OnDelete:RESTRICT" json:"activityGroup,omitempty"`
	ActivitySubtypeID string           `gorm:"not null;type:uuid;column:activity_subtype_id" json:"activitySubtypeId"`
	ActivitySubtype   *ActivitySubtype `gorm:"foreignKey:ActivitySubtypeID;constraint:OnDelete:RESTRICT" json:"activitySubtype,omitempty"`
	IsPrimary         bool             `gorm:"default:false;not null" json:"isPrimary"`
	CreatedAt         time.Time        `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt         time.Time        `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}

// ActivityAuditLog — журнал всех мутаций подтипов для compliance и отладки.
type ActivityAuditLog struct {
	ID            string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ActorUserID   *string   `gorm:"type:uuid" json:"actorUserId,omitempty"`
	SubjectUserID string    `gorm:"not null;type:uuid;index:idx_activity_audit_subject_created" json:"subjectUserId"`
	Action        string    `gorm:"not null;type:varchar(64)" json:"action"`
	OldValue      *string   `gorm:"type:jsonb" json:"oldValue,omitempty"`
	NewValue      *string   `gorm:"type:jsonb" json:"newValue,omitempty"`
	CreatedAt     time.Time `gorm:"autoCreateTime:milli;index:idx_activity_audit_subject_created,sort:desc" json:"createdAt"`
}

type OrderInvitationStatus string

const (
	InvitationStatusPending  OrderInvitationStatus = "pending"
	InvitationStatusAccepted OrderInvitationStatus = "accepted"
	InvitationStatusDeclined OrderInvitationStatus = "declined"
	InvitationStatusExpired  OrderInvitationStatus = "expired"
)

type OrderInvitation struct {
	ID         string                `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	OrderID    string                `gorm:"not null;index" json:"orderId"`
	Order      *Order                `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"order,omitempty"`
	ProviderID string                `gorm:"not null;index" json:"providerId"`
	Provider   *User                 `gorm:"foreignKey:ProviderID;constraint:OnDelete:CASCADE" json:"provider,omitempty"`
	Status     OrderInvitationStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt  time.Time             `gorm:"autoCreateTime:milli" json:"createdAt"`
	UpdatedAt  time.Time             `gorm:"autoUpdateTime:milli" json:"updatedAt"`
}
