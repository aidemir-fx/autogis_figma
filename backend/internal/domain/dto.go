package domain

// Auth DTOs
type RegisterRequest struct {
	Phone           string `json:"phone" validate:"required,min=10"`
	Password        string `json:"password" validate:"required,min=6"`
	AgreedToPrivacy bool   `json:"agreedToPrivacy" validate:"required,eq=true"`
}

type LoginRequest struct {
	Phone    string `json:"phone" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	AccessToken  string        `json:"accessToken"`
	RefreshToken string        `json:"refreshToken"`
	User         *UserResponse `json:"user"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

// User DTOs
type UserAccountType string

const (
	UserAccountTypeCustomer        UserAccountType = "customer"
	UserAccountTypePrivateExecutor UserAccountType = "private_executor"
	UserAccountTypeAutoWash        UserAccountType = "auto_wash"
	UserAccountTypeAutoShop        UserAccountType = "auto_shop"
	UserAccountTypeAutoService     UserAccountType = "auto_service"
	UserAccountTypeAdmin           UserAccountType = "admin"
	UserAccountTypeModerator       UserAccountType = "moderator"
)

type UserCapabilities struct {
	ProfessionalCabinet bool `json:"professionalCabinet"`
	CrmMini             bool `json:"crmMini"`
	BusinessCrm         bool `json:"businessCrm"`
	ProfessionalChat    bool `json:"professionalChat"`
	Applications        bool `json:"applications"`
	Calendar            bool `json:"calendar"`
}

type UserResponse struct {
	ID              string           `json:"id"`
	Phone           string           `json:"phone"`
	Name            *string          `json:"name,omitempty"`
	ContactNumber   *string          `json:"contactNumber,omitempty"`
	Role            UserRole         `json:"role"`
	AccountType     UserAccountType  `json:"accountType"`
	IsProfessional  bool             `json:"isProfessional"`
	Capabilities    UserCapabilities `json:"capabilities"`
	AgreedToPrivacy bool             `json:"agreedToPrivacy"`
	PrivacyAgreedAt *string          `json:"privacyAgreedAt,omitempty"`
	Coordinates     *Point           `json:"coordinates,omitempty"`
	CreatedAt       string           `json:"createdAt"`
	UpdatedAt       string           `json:"updatedAt"`
}

type UpdateUserRequest struct {
	Name          *string `json:"name,omitempty"`
	Phone         *string `json:"phone,omitempty"`
	ContactNumber *string `json:"contactNumber,omitempty"`
	Coordinates   *Point  `json:"coordinates,omitempty"`
}

type UpdateUserRoleRequest struct {
	Role UserRole `json:"role" validate:"required,oneof=customer master auto_wash auto_shop auto_service moderator admin"`
}

type UpdateProfessionalStatusRequest struct {
	Enabled bool `json:"enabled"`
}

type ActivateProfessionalRequest struct {
	Confirm bool `json:"confirm" validate:"required"`
}

type ActivateProfessionalResponse struct {
	Success bool          `json:"success"`
	Message string        `json:"message"`
	User    *UserResponse `json:"user"`
}

// Order DTOs
type CreateOrderRequest struct {
	ProviderIDs    []string             `json:"providerIds" validate:"required,min=1"`
	ActivityTypeID string               `json:"activityTypeId" validate:"required,uuid"`
	Name           string               `json:"name" validate:"required"`
	Phone          string               `json:"phone" validate:"required"`
	CarBrand       string               `json:"carBrand" validate:"required"`
	Description    string               `json:"description" validate:"required"`
	TimePreference *OrderTimePreference `json:"timePreference" validate:"required"`
	PhotoAssetIDs  []string             `json:"photoAssetIds,omitempty"`
	Price          *float32             `json:"price,omitempty"`
}

type UpdateOrderStatusRequest struct {
	Status            OrderStatus `json:"status" validate:"required"`
	ConfirmedDateTime *string     `json:"confirmedDateTime,omitempty"`
	CancelReason      *string     `json:"cancelReason,omitempty"`
	ExpectedUpdatedAt *string     `json:"expectedUpdatedAt,omitempty"`
}

type OrderResponse struct {
	ID                string                `json:"id"`
	CustomerID        string                `json:"customerId"`
	ProviderID        string                `json:"providerId"`
	ActivityTypeID    string                `json:"activityTypeId"`
	Name              string                `json:"name"`
	Phone             string                `json:"phone"`
	CarBrand          string                `json:"carBrand"`
	Description       string                `json:"description"`
	TimePreference    *OrderTimePreference  `json:"timePreference,omitempty"`
	PhotoAssetIDs     []string              `json:"photoAssetIds,omitempty"`
	Price             *float32              `json:"price,omitempty"`
	ConfirmedDateTime *string               `json:"confirmedDateTime,omitempty"`
	CancelReason      *string               `json:"cancelReason,omitempty"`
	ChatID            *string               `json:"chatId,omitempty"`
	Status            OrderStatus           `json:"status"`
	Customer          *UserResponse         `json:"customer,omitempty"`
	Provider          *UserResponse         `json:"provider,omitempty"`
	ActivityType      *ActivityTypeResponse `json:"activityType,omitempty"`
	CreatedAt         string                `json:"createdAt"`
	UpdatedAt         string                `json:"updatedAt"`
}

type SendOrderMessageRequest struct {
	Message string `json:"message" validate:"required"`
}

type ChatUserResponse struct {
	ID    string  `json:"id"`
	Name  *string `json:"name,omitempty"`
	Phone string  `json:"phone"`
}

type ChatMessageResponse struct {
	ID        string            `json:"id"`
	Message   string            `json:"message"`
	CreatedAt string            `json:"createdAt"`
	Status    ChatMessageStatus `json:"status"`
	IsSystem  bool              `json:"isSystem,omitempty"`
	Sender    *ChatUserResponse `json:"sender,omitempty"`
}

type OrderChatResponse struct {
	Order    *OrderResponse         `json:"order"`
	Messages []*ChatMessageResponse `json:"messages"`
}

type UnreadOrderCount struct {
	OrderID string `json:"orderId"`
	ChatID  string `json:"chatId,omitempty"`
	Count   int64  `json:"count"`
}

// Search DTOs
type SearchFilter struct {
	ActivityTypes []string `json:"activityTypes,omitempty"`
	Lat           float64  `json:"lat"`
	Lng           float64  `json:"lng"`
	RadiusKm      float64  `json:"radiusKm"`
}

type ProviderSearchResult struct {
	ID                   string                 `json:"id"`
	UserID               string                 `json:"userId"`
	ActivityType         string                 `json:"activityType"`
	Phone                string                 `json:"phone"`
	Name                 *string                `json:"name,omitempty"`
	FullName             *string                `json:"fullName,omitempty"`
	WorkingPhone         *string                `json:"workingPhone,omitempty"`
	Description          *string                `json:"description,omitempty"`
	Address              *string                `json:"address,omitempty"`
	Role                 UserRole               `json:"role"`
	Coordinates          *Point                 `json:"coordinates,omitempty"`
	CoverImageURL        *string                `json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string                `json:"coverImageAssetId,omitempty"`
	Distance             float64                `json:"distance,omitempty"`
	Status               string                 `json:"status,omitempty"`
	CurrentStatus        string                 `json:"currentStatus,omitempty"`
	OnlineBookingEnabled bool                   `json:"onlineBookingEnabled"`
	LiveQueueEnabled     bool                   `json:"liveQueueEnabled"`
	Rating               float32                `json:"rating,omitempty"`
	ReviewsCount         int                    `json:"reviewsCount,omitempty"`
	WorkFrom             *string                `json:"workFrom,omitempty"`
	WorkTo               *string                `json:"workTo,omitempty"`
	WorkingDays          []bool                 `json:"workingDays,omitempty"`
	Professions          []string               `json:"professions,omitempty"`
	Services             []string               `json:"services,omitempty"`
	AutoMarks            []string               `json:"autoMarks,omitempty"`
	Payments             []string               `json:"payments,omitempty"`
	HasParking           *bool                  `json:"hasParking,omitempty"`
	LiftCount            *int                   `json:"liftCount,omitempty"`
	Warranty             *bool                  `json:"warranty,omitempty"`
	Hotline              *string                `json:"hotline,omitempty"`
	BrandSupport         []string               `json:"brandSupport,omitempty"`
	UserActivityTypes    []ActivityTypeResponse `json:"userActivityTypes,omitempty"`
}

type CombinedSearchResponse struct {
	AllProviders    []*ProviderSearchResult `json:"allProviders"`
	NearbyProviders []*ProviderSearchResult `json:"nearbyProviders"`
}

// Activity Type DTOs
type ActivityTypeResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Description string `json:"description,omitempty"`
	IsActive    bool   `json:"isActive"`
	CreatedAt   string `json:"createdAt"`
}

type CreateActivityTypeRequest struct {
	Name string `json:"name" validate:"required"`
}

// Review DTOs
type CreateReviewRequest struct {
	ToID    string   `json:"toId,omitempty"`
	OrderID *string  `json:"orderId,omitempty"`
	Rating  int      `json:"rating" validate:"required,min=1,max=5"`
	Comment string   `json:"comment"`
	Tags    []string `json:"tags,omitempty"`
}

type ReviewResponse struct {
	ID        string        `json:"id"`
	FromID    string        `json:"fromId"`
	From      *UserResponse `json:"from,omitempty"`
	ToID      string        `json:"toId"`
	To        *UserResponse `json:"to,omitempty"`
	Rating    int           `json:"rating"`
	Comment   string        `json:"comment"`
	Tags      []string      `json:"tags,omitempty"`
	OrderID   *string       `json:"orderId,omitempty"`
	CreatedAt string        `json:"createdAt"`
}

// Master DTOs
type MasterProfileResponse struct {
	ID                   string                 `json:"id"`
	UserID               string                 `json:"userId"`
	User                 *UserResponse          `json:"user,omitempty"`
	FullName             *string                `json:"fullName,omitempty"`
	WorkingPhone         *string                `json:"workingPhone,omitempty"`
	Description          *string                `json:"description,omitempty"`
	Address              *string                `json:"address,omitempty"`
	Coordinates          *Point                 `json:"coordinates,omitempty"`
	Status               string                 `json:"status"`
	CurrentStatus        string                 `json:"currentStatus"`
	OnlineBookingEnabled bool                   `json:"onlineBookingEnabled"`
	LiveQueueEnabled     bool                   `json:"liveQueueEnabled"`
	Rating               float32                `json:"rating"`
	ReviewsCount         int                    `json:"reviewsCount"`
	WorkFrom             *string                `json:"workFrom,omitempty"`
	WorkTo               *string                `json:"workTo,omitempty"`
	WorkingDays          []bool                 `json:"workingDays,omitempty"`
	Professions          []string               `json:"professions,omitempty"`
	Services             []string               `json:"services,omitempty"`
	AutoMarks            []string               `json:"autoMarks,omitempty"`
	Payments             []string               `json:"payments,omitempty"`
	ActivityTypes        []ActivityTypeResponse `json:"activityTypes,omitempty"`
	ActivityGroup        *ActivityGroupRef      `json:"activityGroup,omitempty"`
	ActivitySubtype      *ActivitySubtypeRef    `json:"activitySubtype,omitempty"`
	CreatedAt            string                 `json:"createdAt"`
}

type UpdateMasterProfileRequest struct {
	FullName             *string  `json:"fullName,omitempty"`
	WorkingPhone         *string  `json:"workingPhone,omitempty"`
	Description          *string  `json:"description,omitempty"`
	Address              *string  `json:"address,omitempty"`
	Coordinates          *Point   `json:"coordinates,omitempty"`
	Status               *string  `json:"status,omitempty"`
	OnlineBookingEnabled *bool    `json:"onlineBookingEnabled,omitempty"`
	LiveQueueEnabled     *bool    `json:"liveQueueEnabled,omitempty"`
	WorkFrom             *string  `json:"workFrom,omitempty"`
	WorkTo               *string  `json:"workTo,omitempty"`
	WorkingDays          []bool   `json:"workingDays,omitempty"`
	Professions          []string `json:"professions,omitempty"`
	Services             []string `json:"services,omitempty"`
	AutoMarks            []string `json:"autoMarks,omitempty"`
	Payments             []string `json:"payments,omitempty" validate:"omitempty,dive,oneof=cash card qr sbp apple_pay google_pay"`
}

// AutoWash DTOs
type AutoWashResponse struct {
	ID                   string   `json:"id"`
	UserID               string   `json:"userId"`
	FullName             *string  `json:"fullName,omitempty"`
	WorkingPhone         *string  `json:"workingPhone,omitempty"`
	Description          *string  `json:"description,omitempty"`
	Address              *string  `json:"address,omitempty"`
	Coordinates          *Point   `json:"coordinates,omitempty"`
	CoverImageURL        *string  `json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string  `json:"coverImageAssetId,omitempty"`
	Status               string   `json:"status"`
	OnlineBookingEnabled bool     `json:"onlineBookingEnabled"`
	LiveQueueEnabled     bool     `json:"liveQueueEnabled"`
	Services             []string `json:"services,omitempty"`
	WorkFrom             *string  `json:"workFrom,omitempty"`
	WorkTo               *string  `json:"workTo,omitempty"`
	WorkingDays          []bool   `json:"workingDays,omitempty"`
	BoxCount             *int     `json:"boxCount,omitempty"`
	WasherCount          *int     `json:"washerCount,omitempty"`
	HasWaitingArea       bool     `json:"hasWaitingArea"`
	Payments             []string `json:"payments,omitempty"`
	AdditionalServices   []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"additionalServices,omitempty"`
	ActivityGroup   *ActivityGroupRef   `json:"activityGroup,omitempty"`
	ActivitySubtype *ActivitySubtypeRef `json:"activitySubtype,omitempty"`
	CreatedAt       string              `json:"createdAt"`
}

type UpdateAutoWashRequest struct {
	FullName             *string  `json:"fullName,omitempty"`
	WorkingPhone         *string  `json:"workingPhone,omitempty"`
	Description          *string  `json:"description,omitempty"`
	Address              *string  `json:"address,omitempty"`
	Coordinates          *Point   `json:"coordinates,omitempty"`
	CoverImageURL        *string  `json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string  `json:"coverImageAssetId,omitempty"`
	Status               *string  `json:"status,omitempty"`
	OnlineBookingEnabled *bool    `json:"onlineBookingEnabled,omitempty"`
	LiveQueueEnabled     *bool    `json:"liveQueueEnabled,omitempty"`
	Services             []string `json:"services,omitempty"`
	WorkFrom             *string  `json:"workFrom,omitempty"`
	WorkTo               *string  `json:"workTo,omitempty"`
	WorkingDays          []bool   `json:"workingDays,omitempty"`
	AdditionalServices   []string `json:"additionalServices,omitempty"`
	// Subtype-specific fields. Симметричны RegisterActivityRequest — без них
	// владелец автомойки мог зарегистрироваться с boxCount=5, но не мог
	// изменить его после. Используем те же валидации (lte=500, allow-list для payments).
	BoxCount       *int     `json:"boxCount,omitempty" validate:"omitempty,gte=0,lte=500"`
	WasherCount    *int     `json:"washerCount,omitempty" validate:"omitempty,gte=0,lte=500"`
	HasWaitingArea *bool    `json:"hasWaitingArea,omitempty"`
	Payments       []string `json:"payments,omitempty" validate:"omitempty,dive,oneof=cash card qr sbp apple_pay google_pay"`
}

// AutoShop DTOs
type AutoShopResponse struct {
	ID                   string   `json:"id"`
	UserID               string   `json:"userId"`
	FullName             *string  `json:"fullName,omitempty"`
	WorkingPhone         *string  `json:"workingPhone,omitempty"`
	Description          *string  `json:"description,omitempty"`
	Address              *string  `json:"address,omitempty"`
	Coordinates          *Point   `json:"coordinates,omitempty"`
	CoverImageURL        *string  `json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string  `json:"coverImageAssetId,omitempty"`
	Status               string   `json:"status"`
	OnlineBookingEnabled bool     `json:"onlineBookingEnabled"`
	Services             []string `json:"services,omitempty"`
	Payments             []string `json:"payments,omitempty"`
	WorkFrom             *string  `json:"workFrom,omitempty"`
	WorkTo               *string  `json:"workTo,omitempty"`
	WorkingDays          []bool   `json:"workingDays,omitempty"`
	AdditionalServices   []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"additionalServices,omitempty"`
	ActivityGroup   *ActivityGroupRef   `json:"activityGroup,omitempty"`
	ActivitySubtype *ActivitySubtypeRef `json:"activitySubtype,omitempty"`
	CreatedAt       string              `json:"createdAt"`
}

type UpdateAutoShopRequest struct {
	FullName             *string  `json:"fullName,omitempty"`
	WorkingPhone         *string  `json:"workingPhone,omitempty"`
	Description          *string  `json:"description,omitempty"`
	Address              *string  `json:"address,omitempty"`
	Coordinates          *Point   `json:"coordinates,omitempty"`
	CoverImageURL        *string  `json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string  `json:"coverImageAssetId,omitempty"`
	Status               *string  `json:"status,omitempty"`
	OnlineBookingEnabled *bool    `json:"onlineBookingEnabled,omitempty"`
	Services             []string `json:"services,omitempty"`
	Payments             []string `json:"payments,omitempty" validate:"omitempty,dive,oneof=cash card qr sbp apple_pay google_pay"`
	WorkFrom             *string  `json:"workFrom,omitempty"`
	WorkTo               *string  `json:"workTo,omitempty"`
	WorkingDays          []bool   `json:"workingDays,omitempty"`
	AdditionalServices   []string `json:"additionalServices,omitempty"`
}

// AutoService DTOs
type AutoServiceResponse struct {
	ID                   string              `json:"id"`
	UserID               string              `json:"userId"`
	FullName             *string             `json:"fullName,omitempty"`
	WorkingPhone         *string             `json:"workingPhone,omitempty"`
	Description          *string             `json:"description,omitempty"`
	Address              *string             `json:"address,omitempty"`
	Coordinates          *Point              `json:"coordinates,omitempty"`
	CoverImageURL        *string             `json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string             `json:"coverImageAssetId,omitempty"`
	Status               string              `json:"status"`
	OnlineBookingEnabled bool                `json:"onlineBookingEnabled"`
	LiveQueueEnabled     bool                `json:"liveQueueEnabled"`
	Services             []string            `json:"services,omitempty"`
	Payments             []string            `json:"payments,omitempty"`
	Professions          []string            `json:"professions,omitempty"`
	WorkFrom             *string             `json:"workFrom,omitempty"`
	WorkTo               *string             `json:"workTo,omitempty"`
	WorkingDays          []bool              `json:"workingDays,omitempty"`
	HasParking           bool                `json:"hasParking"`
	LiftCount            int                 `json:"liftCount"`
	Warranty             bool                `json:"warranty"`
	Hotline              *string             `json:"hotline,omitempty"`
	BrandSupport         []string            `json:"brandSupport,omitempty"`
	ActivityGroup        *ActivityGroupRef   `json:"activityGroup,omitempty"`
	ActivitySubtype      *ActivitySubtypeRef `json:"activitySubtype,omitempty"`
	CreatedAt            string              `json:"createdAt"`
}

type UpdateAutoServiceRequest struct {
	FullName             *string  `json:"fullName,omitempty"`
	WorkingPhone         *string  `json:"workingPhone,omitempty"`
	Description          *string  `json:"description,omitempty"`
	Address              *string  `json:"address,omitempty"`
	Coordinates          *Point   `json:"coordinates,omitempty"`
	CoverImageURL        *string  `json:"coverImageUrl,omitempty"`
	CoverImageAssetID    *string  `json:"coverImageAssetId,omitempty"`
	Status               *string  `json:"status,omitempty"`
	OnlineBookingEnabled *bool    `json:"onlineBookingEnabled,omitempty"`
	LiveQueueEnabled     *bool    `json:"liveQueueEnabled,omitempty"`
	Services             []string `json:"services,omitempty"`
	Payments             []string `json:"payments,omitempty" validate:"omitempty,dive,oneof=cash card qr sbp apple_pay google_pay"`
	Professions          []string `json:"professions,omitempty"`
	WorkFrom             *string  `json:"workFrom,omitempty"`
	WorkTo               *string  `json:"workTo,omitempty"`
	WorkingDays          []bool   `json:"workingDays,omitempty"`
	HasParking           *bool    `json:"hasParking,omitempty"`
	LiftCount            *int     `json:"liftCount,omitempty"`
	Warranty             *bool    `json:"warranty,omitempty"`
	Hotline              *string  `json:"hotline,omitempty"`
	BrandSupport         []string `json:"brandSupport,omitempty"`
}

// Activity Registration DTOs
// Поддерживает две модели одновременно (dual-read/dual-write, см. spec §8.3):
//   - Legacy: `activityType` (напр. "master", "auto_wash").
//   - Новая:  `activityGroupCode` + `activitySubtypeCode` (напр. "private_executor" + "master").
//
// При отсутствии одного из новых полей usecase применяет маппинг legacy->new.
type RegisterActivityRequest struct {
	// Legacy field (обратная совместимость). Если заданы новые group/subtype codes — имеет
	// меньший приоритет.
	ActivityType string `json:"activityType,omitempty" validate:"omitempty,oneof=master auto_wash auto_service auto_shop"`

	// New hierarchical classification.
	ActivityGroupCode   string `json:"activityGroupCode,omitempty" validate:"omitempty,max=64"`
	ActivitySubtypeCode string `json:"activitySubtypeCode,omitempty" validate:"omitempty,max=64"`

	FullName     *string `json:"fullName,omitempty"`
	WorkingPhone *string `json:"workingPhone,omitempty"`
	Description  *string `json:"description,omitempty"`
	Address      *string `json:"address,omitempty"`
	Coordinates  *Point  `json:"coordinates,omitempty"`
	// Master specific fields
	Professions          *[]string `json:"professions,omitempty"`
	AutoMarks            *[]string `json:"autoMarks,omitempty"`
	WorkFrom             *string   `json:"workFrom,omitempty"`
	WorkTo               *string   `json:"workTo,omitempty"`
	WorkingDays          *[]bool   `json:"workingDays,omitempty"`
	OnlineBookingEnabled *bool     `json:"onlineBookingEnabled,omitempty"`
	// Common service fields
	Services *[]string `json:"services,omitempty"`
	// Auto service fields
	HasParking   *bool    `json:"hasParking,omitempty"`
	LiftCount    *int     `json:"liftCount,omitempty"`
	Warranty     *bool    `json:"warranty,omitempty"`
	Hotline      *string  `json:"hotline,omitempty"`
	BrandSupport []string `json:"brandSupport,omitempty"`
	// Auto wash subtype-specific fields
	BoxCount       *int     `json:"boxCount,omitempty" validate:"omitempty,gte=0,lte=500"`
	WasherCount    *int     `json:"washerCount,omitempty" validate:"omitempty,gte=0,lte=500"`
	HasWaitingArea *bool    `json:"hasWaitingArea,omitempty"`
	Payments       []string `json:"payments,omitempty" validate:"omitempty,dive,oneof=cash card qr sbp apple_pay google_pay"`
}

// Activity hierarchy DTOs
// Компактный ref используется в ответах профилей, чтобы не разворачивать полный объект.
type ActivityGroupRef struct {
	Code        string `json:"code"`
	DisplayName string `json:"displayName"`
}

type ActivitySubtypeRef struct {
	Code             string `json:"code"`
	DisplayName      string `json:"displayName"`
	CabinetSchemaKey string `json:"cabinetSchemaKey"`
}

type ActivityGroupResponse struct {
	ID          string  `json:"id"`
	Code        string  `json:"code"`
	DisplayName string  `json:"displayName"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"isActive"`
	SortOrder   int     `json:"sortOrder"`
}

type ActivitySubtypeResponse struct {
	ID               string  `json:"id"`
	GroupID          string  `json:"groupId"`
	GroupCode        string  `json:"groupCode"`
	Code             string  `json:"code"`
	DisplayName      string  `json:"displayName"`
	Description      *string `json:"description,omitempty"`
	IsActive         bool    `json:"isActive"`
	SortOrder        int     `json:"sortOrder"`
	CabinetSchemaKey string  `json:"cabinetSchemaKey"`
}

type UserActivityProfileResponse struct {
	ID              string              `json:"id"`
	UserID          string              `json:"userId"`
	ActivityGroup   *ActivityGroupRef   `json:"activityGroup,omitempty"`
	ActivitySubtype *ActivitySubtypeRef `json:"activitySubtype,omitempty"`
	IsPrimary       bool                `json:"isPrimary"`
	CreatedAt       string              `json:"createdAt"`
}

// ErrorResponse — унифицированный envelope ошибок API (см. spec §10.4).
type ErrorResponse struct {
	Success bool         `json:"success"`
	Error   *ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Field   string      `json:"field,omitempty"`
	Details interface{} `json:"details,omitempty"`
}

type ActivityRegistrationResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	ID      string      `json:"id"`
	Type    string      `json:"type"`
	Data    interface{} `json:"data"`
}

type UserActivityTypeResponse struct {
	ID             string                `json:"id"`
	UserID         string                `json:"userId"`
	ActivityTypeID string                `json:"activityTypeId"`
	ActivityType   *ActivityTypeResponse `json:"activityType,omitempty"`
	CreatedAt      string                `json:"createdAt"`
}

// Business Application DTOs

type CreateBusinessApplicationRequest struct {
	// Legacy compatibility-layer. New v2 clients should send
	// activityGroupCode + activitySubtypeCode instead.
	BusinessType BusinessType `json:"businessType,omitempty" validate:"omitempty,oneof=auto_service auto_wash auto_shop tire_fitting detailing station master other"`

	ActivityGroupCode   string  `json:"activityGroupCode,omitempty" validate:"omitempty,max=64"`
	ActivitySubtypeCode string  `json:"activitySubtypeCode,omitempty" validate:"omitempty,max=64"`
	BusinessName        *string `json:"businessName,omitempty" validate:"omitempty,min=2,max=255"`
	ApplicantName       *string `json:"applicantName,omitempty" validate:"omitempty,min=2,max=255"`
	City                string  `json:"city" validate:"required,min=1,max=128"`
	Address             *string `json:"address,omitempty"`
	Phone               string  `json:"phone" validate:"required,min=5,max=32"`
	YandexMapsURL       *string `json:"yandexMapsUrl,omitempty" validate:"omitempty,url,max=2048"`
	Comment             *string `json:"comment,omitempty"`
	AgreedToTerms       bool    `json:"agreedToTerms" validate:"required,eq=true"`

	// Legacy read/write compatibility. New clients must not send these fields.
	ContactPerson *string `json:"contactPerson,omitempty" validate:"omitempty,min=2,max=255"`
	Email         *string `json:"email,omitempty" validate:"omitempty,email"`
}

type UpdateBusinessApplicationStatusRequest struct {
	Status          BusinessApplicationStatus `json:"status" validate:"required,oneof=pending approved rejected needs_revision"`
	RejectionReason *string                   `json:"rejectionReason,omitempty"`
}

type BusinessApplicationResponse struct {
	ID                  string                    `json:"id"`
	UserID              string                    `json:"userId"`
	BusinessType        BusinessType              `json:"businessType,omitempty"`
	ActivityGroupCode   *string                   `json:"activityGroupCode,omitempty"`
	ActivitySubtypeCode *string                   `json:"activitySubtypeCode,omitempty"`
	BusinessName        *string                   `json:"businessName,omitempty"`
	ApplicantName       *string                   `json:"applicantName,omitempty"`
	City                string                    `json:"city"`
	Address             *string                   `json:"address,omitempty"`
	Phone               string                    `json:"phone"`
	YandexMapsURL       *string                   `json:"yandexMapsUrl,omitempty"`
	ContactPerson       *string                   `json:"contactPerson,omitempty"`
	Email               *string                   `json:"email,omitempty"`
	Comment             *string                   `json:"comment,omitempty"`
	Status              BusinessApplicationStatus `json:"status"`
	RejectionReason     *string                   `json:"rejectionReason,omitempty"`
	ReviewedAt          *string                   `json:"reviewedAt,omitempty"`
	CreatedAt           string                    `json:"createdAt"`
	UpdatedAt           string                    `json:"updatedAt"`
}
