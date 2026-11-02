package usecase

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/pkg/geo"
	"github.com/gmt061/autogis-backend/internal/pkg/s3client"
	"github.com/gmt061/autogis-backend/internal/repository"
)

// SearchUseCase handles search business logic
type SearchUseCase struct {
	masterRepo           repository.MasterRepository
	autoWashRepo         repository.AutoWashRepository
	autoShopRepo         repository.AutoShopRepository
	autoServiceRepo      repository.AutoServiceRepository
	userActivityTypeRepo repository.UserActivityTypeRepository
	userRepo             repository.UserRepository
	activityTypeRepo     repository.ActivityTypeRepository
	mediaRepo            repository.MediaRepository
	s3                   *s3client.S3Client
}

const (
	providerStatusAvailable   = "available"
	providerStatusSchedule    = "schedule"
	providerStatusUnavailable = "unavailable"
)

var moscowLocation = func() *time.Location {
	loc, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		return time.FixedZone("Europe/Moscow", 3*60*60)
	}
	return loc
}()

func NewSearchUseCase(
	masterRepo repository.MasterRepository,
	autoWashRepo repository.AutoWashRepository,
	autoShopRepo repository.AutoShopRepository,
	autoServiceRepo repository.AutoServiceRepository,
	userActivityTypeRepo repository.UserActivityTypeRepository,
	userRepo repository.UserRepository,
	activityTypeRepo repository.ActivityTypeRepository,
	mediaRepo repository.MediaRepository,
	s3 *s3client.S3Client,
) *SearchUseCase {
	return &SearchUseCase{
		masterRepo:           masterRepo,
		autoWashRepo:         autoWashRepo,
		autoShopRepo:         autoShopRepo,
		autoServiceRepo:      autoServiceRepo,
		userActivityTypeRepo: userActivityTypeRepo,
		userRepo:             userRepo,
		activityTypeRepo:     activityTypeRepo,
		mediaRepo:            mediaRepo,
		s3:                   s3,
	}
}

func resolveProviderCurrentStatus(status string, workingDays []bool, workFrom, workTo *string, now time.Time) string {
	if status == providerStatusUnavailable {
		return providerStatusUnavailable
	}

	if status != providerStatusSchedule && status != providerStatusAvailable && status != "" {
		return providerStatusUnavailable
	}

	if isOpenBySchedule(workingDays, workFrom, workTo, now.In(moscowLocation)) {
		return providerStatusAvailable
	}

	return providerStatusUnavailable
}

func isOpenBySchedule(workingDays []bool, workFrom, workTo *string, now time.Time) bool {
	if len(workingDays) == 0 || workFrom == nil || workTo == nil {
		return false
	}

	start, err := parseClockMinutes(*workFrom)
	if err != nil {
		return false
	}
	end, err := parseClockMinutes(*workTo)
	if err != nil {
		return false
	}

	todayIndex := (int(now.Weekday()) + 6) % 7
	currentMinutes := now.Hour()*60 + now.Minute()

	if start == end {
		return dayEnabled(workingDays, todayIndex)
	}

	if start < end {
		return dayEnabled(workingDays, todayIndex) &&
			currentMinutes >= start &&
			currentMinutes < end
	}

	previousIndex := (todayIndex + 6) % 7
	return (dayEnabled(workingDays, todayIndex) && currentMinutes >= start) ||
		(dayEnabled(workingDays, previousIndex) && currentMinutes < end)
}

func parseClockMinutes(value string) (int, error) {
	parsed, err := time.Parse("15:04", strings.TrimSpace(value))
	if err != nil {
		return 0, err
	}
	return parsed.Hour()*60 + parsed.Minute(), nil
}

func dayEnabled(days []bool, index int) bool {
	return index >= 0 && index < len(days) && days[index]
}

func (uc *SearchUseCase) FindCombinedProviders(
	ctx context.Context,
	filter *domain.SearchFilter,
) (*domain.CombinedSearchResponse, error) {
	if err := validateSearchFilter(filter); err != nil {
		return nil, err
	}

	if filter == nil || len(filter.ActivityTypes) == 0 {
		return &domain.CombinedSearchResponse{
			AllProviders:    []*domain.ProviderSearchResult{},
			NearbyProviders: []*domain.ProviderSearchResult{},
		}, nil
	}

	activityTypeSet := make(map[string]bool)
	for _, name := range filter.ActivityTypes {
		activityTypeSet[name] = true
	}
	if filter.RadiusKm <= 0 {
		filter.RadiusKm = 10
	}

	allProviderResults := make([]*domain.ProviderSearchResult, 0)
	nearbyKeys := make(map[string]struct{})

	addProvider := func(result *domain.ProviderSearchResult, isNearby bool) {
		if result == nil {
			return
		}
		allProviderResults = append(allProviderResults, result)
		if isNearby {
			nearbyKeys[result.ActivityType+":"+result.ID] = struct{}{}
		}
	}

	if activityTypeSet["master"] {
		masters, err := uc.masterRepo.GetAll(ctx)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		// Batch-load activity types for all masters in a single query to avoid N+1.
		userIDs := make([]string, 0, len(masters))
		for _, m := range masters {
			if m.User != nil {
				userIDs = append(userIDs, m.UserID)
			}
		}
		uatsByUser, err := uc.userActivityTypeRepo.GetByUserIDs(ctx, userIDs)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		for _, master := range masters {
			if master.User == nil {
				continue
			}
			if !isListable(master.FullName, master.User.Name, master.Coordinates, master.User.Coordinates, master.WorkingPhone, master.User.ContactNumber) {
				continue
			}
			distanceMeters, isNearby := uc.calculateDistanceMeters(providerCoordinates(master.Coordinates, master.User.Coordinates), filter.Lat, filter.Lng, filter.RadiusKm)
			result := uc.masterToSearchResultWithUATs(ctx, master, distanceMeters, uatsByUser[master.UserID])
			addProvider(result, isNearby)
		}

		if nearbyMasters, err := uc.masterRepo.GetNearby(ctx, filter.Lat, filter.Lng, filter.RadiusKm); err == nil {
			for _, master := range nearbyMasters {
				nearbyKeys["master:"+master.ID] = struct{}{}
			}
		}
	}

	if activityTypeSet["auto_wash"] {
		autoWashes, err := uc.autoWashRepo.GetAll(ctx)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		for _, aw := range autoWashes {
			if aw.User == nil {
				continue
			}
			if !isListable(aw.FullName, aw.User.Name, aw.Coordinates, aw.User.Coordinates, aw.WorkingPhone, aw.User.ContactNumber) {
				continue
			}
			distanceMeters, isNearby := uc.calculateDistanceMeters(providerCoordinates(aw.Coordinates, aw.User.Coordinates), filter.Lat, filter.Lng, filter.RadiusKm)
			result := uc.autoWashToSearchResult(aw, distanceMeters)
			addProvider(result, isNearby)
		}

		if nearbyAutoWashes, err := uc.autoWashRepo.GetNearby(ctx, filter.Lat, filter.Lng, filter.RadiusKm); err == nil {
			for _, aw := range nearbyAutoWashes {
				nearbyKeys["auto_wash:"+aw.ID] = struct{}{}
			}
		}
	}

	if activityTypeSet["auto_shop"] {
		autoShops, err := uc.autoShopRepo.GetAll(ctx)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		for _, shop := range autoShops {
			if shop.User == nil {
				continue
			}
			if !isListable(shop.FullName, shop.User.Name, shop.Coordinates, shop.User.Coordinates, shop.WorkingPhone, shop.User.ContactNumber) {
				continue
			}
			distanceMeters, isNearby := uc.calculateDistanceMeters(providerCoordinates(shop.Coordinates, shop.User.Coordinates), filter.Lat, filter.Lng, filter.RadiusKm)
			result := uc.autoShopToSearchResult(shop, distanceMeters)
			addProvider(result, isNearby)
		}

		if nearbyAutoShops, err := uc.autoShopRepo.GetNearby(ctx, filter.Lat, filter.Lng, filter.RadiusKm); err == nil {
			for _, shop := range nearbyAutoShops {
				nearbyKeys["auto_shop:"+shop.ID] = struct{}{}
			}
		}
	}

	if activityTypeSet["auto_service"] {
		autoServices, err := uc.autoServiceRepo.GetAll(ctx)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		for _, service := range autoServices {
			if service.User == nil {
				continue
			}
			if !isListable(service.FullName, service.User.Name, service.Coordinates, service.User.Coordinates, service.WorkingPhone, service.User.ContactNumber) {
				continue
			}
			distanceMeters, isNearby := uc.calculateDistanceMeters(providerCoordinates(service.Coordinates, service.User.Coordinates), filter.Lat, filter.Lng, filter.RadiusKm)
			result := uc.autoServiceToSearchResult(service, distanceMeters)
			addProvider(result, isNearby)
		}

		if nearbyAutoServices, err := uc.autoServiceRepo.GetNearby(ctx, filter.Lat, filter.Lng, filter.RadiusKm); err == nil {
			for _, service := range nearbyAutoServices {
				nearbyKeys["auto_service:"+service.ID] = struct{}{}
			}
		}
	}

	sortByDistance := func(items []*domain.ProviderSearchResult) {
		sort.SliceStable(items, func(i, j int) bool {
			leftHasCoords := items[i].Coordinates != nil
			rightHasCoords := items[j].Coordinates != nil
			if leftHasCoords != rightHasCoords {
				return leftHasCoords
			}
			leftDistance := items[i].Distance
			rightDistance := items[j].Distance
			if !leftHasCoords {
				leftDistance = math.MaxFloat64
			}
			if !rightHasCoords {
				rightDistance = math.MaxFloat64
			}
			return leftDistance < rightDistance
		})
	}

	sortByDistance(allProviderResults)

	nearbyProviderResults := make([]*domain.ProviderSearchResult, 0, len(allProviderResults))
	for _, provider := range allProviderResults {
		if _, ok := nearbyKeys[provider.ActivityType+":"+provider.ID]; ok {
			nearbyProviderResults = append(nearbyProviderResults, provider)
		}
	}
	sortByDistance(nearbyProviderResults)

	return &domain.CombinedSearchResponse{
		AllProviders:    allProviderResults,
		NearbyProviders: nearbyProviderResults,
	}, nil
}

func (uc *SearchUseCase) GetProviderByTypeAndID(
	ctx context.Context,
	activityType string,
	id string,
	lat *float64,
	lng *float64,
) (*domain.ProviderSearchResult, error) {
	normalizedType := strings.TrimSpace(activityType)
	var distanceMeters float64
	hasDistance := lat != nil && lng != nil

	switch normalizedType {
	case "master":
		master, err := uc.masterRepo.GetByID(ctx, id)
		if err != nil {
			return nil, apperrors.ErrNotFound
		}
		if master.User == nil {
			return nil, apperrors.ErrNotFound
		}
		if hasDistance && master.User != nil {
			distanceMeters, _ = uc.calculateDistanceMeters(providerCoordinates(master.Coordinates, master.User.Coordinates), *lat, *lng, math.MaxFloat64)
		}
		return uc.masterToSearchResult(ctx, master, distanceMeters), nil
	case "auto_service":
		service, err := uc.autoServiceRepo.GetByID(ctx, id)
		if err != nil {
			return nil, apperrors.ErrNotFound
		}
		if service.User == nil {
			return nil, apperrors.ErrNotFound
		}
		if hasDistance && service.User != nil {
			distanceMeters, _ = uc.calculateDistanceMeters(providerCoordinates(service.Coordinates, service.User.Coordinates), *lat, *lng, math.MaxFloat64)
		}
		return uc.autoServiceToSearchResult(service, distanceMeters), nil
	case "auto_shop":
		shop, err := uc.autoShopRepo.GetByID(ctx, id)
		if err != nil {
			return nil, apperrors.ErrNotFound
		}
		if shop.User == nil {
			return nil, apperrors.ErrNotFound
		}
		if hasDistance && shop.User != nil {
			distanceMeters, _ = uc.calculateDistanceMeters(providerCoordinates(shop.Coordinates, shop.User.Coordinates), *lat, *lng, math.MaxFloat64)
		}
		return uc.autoShopToSearchResult(shop, distanceMeters), nil
	case "auto_wash":
		aw, err := uc.autoWashRepo.GetByID(ctx, id)
		if err != nil {
			return nil, apperrors.ErrNotFound
		}
		if aw.User == nil {
			return nil, apperrors.ErrNotFound
		}
		if hasDistance && aw.User != nil {
			distanceMeters, _ = uc.calculateDistanceMeters(providerCoordinates(aw.Coordinates, aw.User.Coordinates), *lat, *lng, math.MaxFloat64)
		}
		return uc.autoWashToSearchResult(aw, distanceMeters), nil
	default:
		return nil, apperrors.New(
			"VALIDATION_FAILED",
			fmt.Sprintf("invalid activity type: %s", normalizedType),
			http.StatusBadRequest,
		)
	}
}

func (uc *SearchUseCase) masterHasActivityType(ctx context.Context, userID string, activityTypeIDs []string) bool {
	uats, err := uc.userActivityTypeRepo.GetByUserID(ctx, userID)
	if err != nil {
		return false
	}

	for _, uat := range uats {
		for _, reqID := range activityTypeIDs {
			if uat.ActivityTypeID == reqID {
				return true
			}
		}
	}

	return false
}

func validateSearchFilter(filter *domain.SearchFilter) error {
	if filter == nil {
		return apperrors.New("VALIDATION_FAILED", "search filter is required", http.StatusBadRequest)
	}
	if filter.Lat < -90 || filter.Lat > 90 {
		return apperrors.New("VALIDATION_FAILED", "lat must be between -90 and 90", http.StatusBadRequest)
	}
	if filter.Lng < -180 || filter.Lng > 180 {
		return apperrors.New("VALIDATION_FAILED", "lng must be between -180 and 180", http.StatusBadRequest)
	}
	if filter.RadiusKm <= 0 || filter.RadiusKm > 200 {
		return apperrors.New("VALIDATION_FAILED", "radiusKm must be in range (0, 200]", http.StatusBadRequest)
	}
	if len(filter.ActivityTypes) == 0 {
		return nil
	}
	if len(filter.ActivityTypes) > 4 {
		return apperrors.New("VALIDATION_FAILED", "too many activity types", http.StatusBadRequest)
	}

	allowed := map[string]struct{}{
		"master":       {},
		"auto_wash":    {},
		"auto_shop":    {},
		"auto_service": {},
	}
	seen := make(map[string]struct{}, len(filter.ActivityTypes))
	normalized := make([]string, 0, len(filter.ActivityTypes))
	for _, t := range filter.ActivityTypes {
		if _, ok := allowed[t]; !ok {
			return apperrors.New("VALIDATION_FAILED", "invalid activity type: "+t, http.StatusBadRequest)
		}
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		normalized = append(normalized, t)
	}
	filter.ActivityTypes = normalized

	return nil
}

// isListable returns true when a provider profile is complete enough to be
// shown in public search and on the map. Минимальные обязательные поля:
//   - отображаемое имя (FullName или User.Name)
//   - координаты (в профиле или в User)
//   - публичный телефон (workingPhone или contactNumber)
//
// Это временный client-side фильтр до появления явного флага `is_published`
// и модерационного workflow (см. roadmap v2.1).
func isListable(
	fullName *string,
	userName *string,
	profileCoords *domain.Point,
	userCoords *domain.Point,
	workingPhone *string,
	contactNumber *string,
) bool {
	displayName := ""
	if fullName != nil && strings.TrimSpace(*fullName) != "" {
		displayName = *fullName
	} else if userName != nil && strings.TrimSpace(*userName) != "" {
		displayName = *userName
	}
	if displayName == "" {
		return false
	}
	if profileCoords == nil && userCoords == nil {
		return false
	}
	if publicPhone(workingPhone, contactNumber) == "" {
		return false
	}
	return true
}

// publicPhone returns the phone that is safe to expose in public search
// results. Уникальный номер авторизации (user.Phone) никогда не возвращается —
// он используется как логин и утечка в открытую выдачу нарушает приватность.
// Порядок fallback: workingPhone → contactNumber → "".
func publicPhone(working *string, contact *string) string {
	if working != nil && *working != "" {
		return *working
	}
	if contact != nil && *contact != "" {
		return *contact
	}
	return ""
}

func (uc *SearchUseCase) calculateDistanceMeters(point *domain.Point, lat, lng, radiusKm float64) (float64, bool) {
	if point == nil {
		return 0, false
	}

	distanceKm := geo.CalculateDistance(
		lat,
		lng,
		point.Coordinates[1],
		point.Coordinates[0],
	)
	return distanceKm * 1000, distanceKm <= radiusKm
}

func providerCoordinates(profileCoords, userCoords *domain.Point) *domain.Point {
	if profileCoords != nil {
		return profileCoords
	}
	return userCoords
}

// masterToSearchResult is the single-request variant. Prefer
// masterToSearchResultWithUATs when processing a list of masters — it avoids
// N+1 queries by accepting pre-loaded activity types.
func (uc *SearchUseCase) masterToSearchResult(ctx context.Context, master *domain.Master, distance float64) *domain.ProviderSearchResult {
	uats, _ := uc.userActivityTypeRepo.GetByUserID(ctx, master.UserID)
	return uc.masterToSearchResultWithUATs(ctx, master, distance, uats)
}

func (uc *SearchUseCase) masterToSearchResultWithUATs(
	ctx context.Context,
	master *domain.Master,
	distance float64,
	uats []*domain.UserActivityType,
) *domain.ProviderSearchResult {
	coordinates := master.Coordinates
	if coordinates == nil && master.User != nil {
		coordinates = master.User.Coordinates
	}
	workingDays := stringDaysToBool(master.WorkingDays)

	result := &domain.ProviderSearchResult{
		ID:                   master.ID,
		UserID:               master.UserID,
		ActivityType:         "master",
		Phone:                publicPhone(master.WorkingPhone, master.User.ContactNumber),
		Name:                 master.User.Name,
		FullName:             master.FullName,
		WorkingPhone:         master.WorkingPhone,
		Description:          master.Description,
		Address:              master.Address,
		Role:                 master.User.Role,
		Coordinates:          coordinates,
		AvatarURL:            uc.accountAvatarURL(ctx, master.UserID),
		CoverImageURL:        nil,
		CoverImageAssetID:    master.CoverImageAssetID,
		Distance:             distance,
		Status:               master.Status,
		CurrentStatus:        resolveProviderCurrentStatus(master.Status, workingDays, master.WorkFrom, master.WorkTo, time.Now()),
		OnlineBookingEnabled: master.OnlineBookingEnabled,
		Rating:               master.Rating,
		ReviewsCount:         master.ReviewsCount,
		WorkFrom:             master.WorkFrom,
		WorkTo:               master.WorkTo,
		WorkingDays:          workingDays,
		Professions:          master.Professions,
		Services:             master.Services,
		AutoMarks:            master.AutoMarks,
		Payments:             []string(master.Payments),
		HasParking:           &master.HasParking,
		LiftCount:            &master.LiftCount,
		HasWifi:              &master.HasWifi,
		HasWaitingArea:       &master.HasWaitingArea,
		OffersCoffee:         &master.OffersCoffee,
		HasEvacuation:        &master.HasEvacuation,
		HasPartsInStock:      &master.HasPartsInStock,
	}

	if len(uats) > 0 {
		result.UserActivityTypes = make([]domain.ActivityTypeResponse, 0, len(uats))
		for _, uat := range uats {
			if uat.ActivityType != nil {
				result.UserActivityTypes = append(result.UserActivityTypes, *mapActivityTypeToResponse(uat.ActivityType))
			}
		}
	}

	return result
}

func (uc *SearchUseCase) accountAvatarURL(ctx context.Context, accountID string) *string {
	if uc.mediaRepo == nil || uc.s3 == nil || accountID == "" {
		return nil
	}

	asset, err := uc.mediaRepo.GetActiveAvatarByEntity(ctx, string(domain.MediaEntityAccount), accountID)
	if err != nil || asset == nil || asset.Status != domain.MediaStatusReady || asset.ObjectKey == nil || *asset.ObjectKey == "" {
		return nil
	}

	url := uc.s3.CDNURLForKey(*asset.ObjectKey)
	return &url
}

func (uc *SearchUseCase) autoWashToSearchResult(aw *domain.AutoWash, distance float64) *domain.ProviderSearchResult {
	workingDays := stringDaysToBool(aw.WorkingDays)
	return &domain.ProviderSearchResult{
		ID:                   aw.ID,
		UserID:               aw.UserID,
		ActivityType:         "auto_wash",
		Phone:                publicPhone(aw.WorkingPhone, aw.User.ContactNumber),
		Name:                 aw.User.Name,
		FullName:             aw.FullName,
		WorkingPhone:         aw.WorkingPhone,
		Description:          aw.Description,
		Address:              aw.Address,
		Role:                 aw.User.Role,
		Coordinates:          aw.Coordinates,
		CoverImageURL:        aw.CoverImageURL,
		CoverImageAssetID:    aw.CoverImageAssetID,
		Distance:             distance,
		Status:               aw.Status,
		CurrentStatus:        resolveProviderCurrentStatus(aw.Status, workingDays, aw.WorkFrom, aw.WorkTo, time.Now()),
		OnlineBookingEnabled: false,
		LiveQueueEnabled:     aw.LiveQueueEnabled,
		Rating:               aw.Rating,
		ReviewsCount:         aw.ReviewsCount,
		WorkFrom:             aw.WorkFrom,
		WorkTo:               aw.WorkTo,
		WorkingDays:          workingDays,
		Services:             []string(aw.Services),
		Payments:             []string(aw.Payments),
		UserActivityTypes:    []domain.ActivityTypeResponse{},
	}
}

func (uc *SearchUseCase) autoShopToSearchResult(shop *domain.AutoShop, distance float64) *domain.ProviderSearchResult {
	workingDays := stringDaysToBool(shop.WorkingDays)
	return &domain.ProviderSearchResult{
		ID:                   shop.ID,
		UserID:               shop.UserID,
		ActivityType:         "auto_shop",
		Phone:                publicPhone(shop.WorkingPhone, shop.User.ContactNumber),
		Name:                 shop.User.Name,
		FullName:             shop.FullName,
		WorkingPhone:         shop.WorkingPhone,
		Description:          shop.Description,
		Address:              shop.Address,
		Role:                 shop.User.Role,
		Coordinates:          shop.Coordinates,
		CoverImageURL:        shop.CoverImageURL,
		CoverImageAssetID:    shop.CoverImageAssetID,
		Distance:             distance,
		Status:               shop.Status,
		CurrentStatus:        resolveProviderCurrentStatus(shop.Status, workingDays, shop.WorkFrom, shop.WorkTo, time.Now()),
		OnlineBookingEnabled: shop.OnlineBookingEnabled,
		Rating:               shop.Rating,
		ReviewsCount:         shop.ReviewsCount,
		WorkFrom:             shop.WorkFrom,
		WorkTo:               shop.WorkTo,
		WorkingDays:          workingDays,
		Services:             []string(shop.Services),
		Payments:             []string(shop.Payments),
		UserActivityTypes:    []domain.ActivityTypeResponse{},
	}
}

func (uc *SearchUseCase) autoServiceToSearchResult(service *domain.AutoService, distance float64) *domain.ProviderSearchResult {
	hasParking := service.HasParking
	liftCount := service.LiftCount
	warranty := service.Warranty
	workingDays := stringDaysToBool(service.WorkingDays)

	return &domain.ProviderSearchResult{
		ID:                   service.ID,
		UserID:               service.UserID,
		ActivityType:         "auto_service",
		Phone:                publicPhone(service.WorkingPhone, service.User.ContactNumber),
		Name:                 service.User.Name,
		FullName:             service.FullName,
		WorkingPhone:         service.WorkingPhone,
		Description:          service.Description,
		Address:              service.Address,
		Role:                 service.User.Role,
		Coordinates:          service.Coordinates,
		CoverImageURL:        service.CoverImageURL,
		CoverImageAssetID:    service.CoverImageAssetID,
		Distance:             distance,
		Status:               service.Status,
		CurrentStatus:        resolveProviderCurrentStatus(service.Status, workingDays, service.WorkFrom, service.WorkTo, time.Now()),
		OnlineBookingEnabled: service.OnlineBookingEnabled,
		Rating:               service.Rating,
		ReviewsCount:         service.ReviewsCount,
		WorkFrom:             service.WorkFrom,
		WorkTo:               service.WorkTo,
		WorkingDays:          workingDays,
		Professions:          []string(service.Professions),
		Services:             []string(service.Services),
		Payments:             []string(service.Payments),
		HasParking:           &hasParking,
		LiftCount:            &liftCount,
		Warranty:             &warranty,
		Hotline:              service.Hotline,
		BrandSupport:         []string(service.BrandSupport),
		UserActivityTypes:    []domain.ActivityTypeResponse{},
	}
}

// ActivityTypeUseCase handles activity type business logic
type ActivityTypeUseCase struct {
	activityTypeRepo repository.ActivityTypeRepository
}

func NewActivityTypeUseCase(activityTypeRepo repository.ActivityTypeRepository) *ActivityTypeUseCase {
	return &ActivityTypeUseCase{
		activityTypeRepo: activityTypeRepo,
	}
}

func (uc *ActivityTypeUseCase) CreateActivityType(
	ctx context.Context,
	req *domain.CreateActivityTypeRequest,
) (*domain.ActivityTypeResponse, error) {
	// Check if activity type already exists
	existing, _ := uc.activityTypeRepo.GetByName(ctx, req.Name)
	if existing != nil {
		return nil, apperrors.New("ACTIVITY_TYPE_EXISTS", "Activity type already exists", 409)
	}

	activityType := &domain.ActivityType{
		Name:     req.Name,
		IsActive: true,
	}

	if err := uc.activityTypeRepo.Create(ctx, activityType); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.activityTypeToResponse(activityType), nil
}

func (uc *ActivityTypeUseCase) GetActivityType(
	ctx context.Context,
	id string,
) (*domain.ActivityTypeResponse, error) {
	activityType, err := uc.activityTypeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}
	return uc.activityTypeToResponse(activityType), nil
}

func (uc *ActivityTypeUseCase) GetAllActivityTypes(ctx context.Context) ([]*domain.ActivityTypeResponse, error) {
	activityTypes, err := uc.activityTypeRepo.GetAll(ctx)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	responses := make([]*domain.ActivityTypeResponse, len(activityTypes))
	for i, at := range activityTypes {
		responses[i] = uc.activityTypeToResponse(at)
	}
	return responses, nil
}

func (uc *ActivityTypeUseCase) GetActiveActivityTypes(ctx context.Context) ([]*domain.ActivityTypeResponse, error) {
	activityTypes, err := uc.activityTypeRepo.GetActive(ctx)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	responses := make([]*domain.ActivityTypeResponse, len(activityTypes))
	for i, at := range activityTypes {
		responses[i] = uc.activityTypeToResponse(at)
	}
	return responses, nil
}

func (uc *ActivityTypeUseCase) UpdateActivityType(
	ctx context.Context,
	id string,
	req *domain.CreateActivityTypeRequest,
) (*domain.ActivityTypeResponse, error) {
	activityType, err := uc.activityTypeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}

	activityType.Name = req.Name

	if err := uc.activityTypeRepo.Update(ctx, activityType); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.activityTypeToResponse(activityType), nil
}

func (uc *ActivityTypeUseCase) DeleteActivityType(ctx context.Context, id string) error {
	_, err := uc.activityTypeRepo.GetByID(ctx, id)
	if err != nil {
		return apperrors.ErrNotFound
	}

	return uc.activityTypeRepo.Delete(ctx, id)
}

func (uc *ActivityTypeUseCase) activityTypeToResponse(at *domain.ActivityType) *domain.ActivityTypeResponse {
	return mapActivityTypeToResponse(at)
}

// ReviewUseCase handles review business logic
type ReviewUseCase struct {
	reviewRepo      repository.ReviewRepository
	userRepo        repository.UserRepository
	orderRepo       repository.OrderRepository
	masterRepo      repository.MasterRepository
	autoWashRepo    repository.AutoWashRepository
	autoShopRepo    repository.AutoShopRepository
	autoServiceRepo repository.AutoServiceRepository
}

func NewReviewUseCase(
	reviewRepo repository.ReviewRepository,
	userRepo repository.UserRepository,
	orderRepo repository.OrderRepository,
	masterRepo repository.MasterRepository,
	autoWashRepo repository.AutoWashRepository,
	autoShopRepo repository.AutoShopRepository,
	autoServiceRepo repository.AutoServiceRepository,
) *ReviewUseCase {
	return &ReviewUseCase{
		reviewRepo:      reviewRepo,
		userRepo:        userRepo,
		orderRepo:       orderRepo,
		masterRepo:      masterRepo,
		autoWashRepo:    autoWashRepo,
		autoShopRepo:    autoShopRepo,
		autoServiceRepo: autoServiceRepo,
	}
}

func (uc *ReviewUseCase) CreateReview(
	ctx context.Context,
	fromID string,
	req *domain.CreateReviewRequest,
) (*domain.ReviewResponse, error) {
	if req.OrderID == nil || strings.TrimSpace(*req.OrderID) == "" {
		return nil, apperrors.New("REVIEW_ORDER_REQUIRED", "Review must be linked to a completed order", http.StatusBadRequest)
	}
	return uc.CreateReviewForOrder(ctx, fromID, *req.OrderID, req)
}

func (uc *ReviewUseCase) CreateReviewForOrder(
	ctx context.Context,
	fromID string,
	orderID string,
	req *domain.CreateReviewRequest,
) (*domain.ReviewResponse, error) {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, apperrors.ErrOrderNotFound
	}
	if order.Status != domain.OrderStatusCompleted {
		return nil, apperrors.New("REVIEW_ORDER_NOT_COMPLETED", "Review is available after the order is completed", http.StatusBadRequest)
	}
	if order.CustomerID != fromID || order.ProviderID == nil || strings.TrimSpace(*order.ProviderID) == "" {
		return nil, apperrors.New("REVIEW_FORBIDDEN", "Only the customer can review the provider for this order", http.StatusForbidden)
	}
	if req.Rating < 1 || req.Rating > 5 {
		return nil, apperrors.New("REVIEW_RATING_INVALID", "Rating must be between 1 and 5", http.StatusBadRequest)
	}

	comment := strings.TrimSpace(req.Comment)
	if len(comment) > 2000 {
		return nil, apperrors.New("REVIEW_COMMENT_TOO_LONG", "Comment must be 2000 characters or fewer", http.StatusBadRequest)
	}
	tags := normalizeReviewTags(req.Tags)

	existing, err := uc.reviewRepo.GetByOrderAndFromID(ctx, orderID, fromID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if existing != nil {
		return nil, apperrors.New("REVIEW_ALREADY_EXISTS", "A review has already been submitted for this order", http.StatusConflict)
	}

	from, err := uc.userRepo.GetByID(ctx, fromID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	providerID := *order.ProviderID
	to, err := uc.userRepo.GetByID(ctx, providerID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	orderIDCopy := orderID
	review := &domain.Review{
		FromID:  fromID,
		ToID:    providerID,
		OrderID: &orderIDCopy,
		Rating:  req.Rating,
		Comment: comment,
		Tags:    tags,
	}

	if err := uc.reviewRepo.Create(ctx, review); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	uc.updateProviderRating(ctx, providerID, to.Role)

	return uc.reviewToResponse(&domain.Review{
		ID:        review.ID,
		FromID:    review.FromID,
		From:      from,
		ToID:      review.ToID,
		To:        to,
		OrderID:   review.OrderID,
		Rating:    review.Rating,
		Comment:   review.Comment,
		Tags:      []string(review.Tags),
		CreatedAt: review.CreatedAt,
	}), nil
}

func (uc *ReviewUseCase) GetReviewForOrder(ctx context.Context, fromID, orderID string) (*domain.ReviewResponse, error) {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, apperrors.ErrOrderNotFound
	}
	isCustomer := order.CustomerID == fromID
	isProvider := order.ProviderID != nil && strings.TrimSpace(*order.ProviderID) == fromID
	if !isCustomer && !isProvider {
		return nil, apperrors.New("REVIEW_FORBIDDEN", "Only an order participant can view this review", http.StatusForbidden)
	}
	reviewAuthorID := fromID
	if isProvider {
		reviewAuthorID = order.CustomerID
	}
	review, err := uc.reviewRepo.GetByOrderAndFromID(ctx, orderID, reviewAuthorID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if review == nil {
		return nil, nil
	}
	return uc.reviewToResponse(review), nil
}

func (uc *ReviewUseCase) DeleteReviewForOrder(ctx context.Context, fromID, orderID string) error {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return apperrors.ErrOrderNotFound
	}
	if order.CustomerID != fromID {
		return apperrors.New("REVIEW_FORBIDDEN", "Only the review author can delete this review", http.StatusForbidden)
	}

	review, err := uc.reviewRepo.GetByOrderAndFromID(ctx, orderID, fromID)
	if err != nil {
		return apperrors.ErrInternalServer
	}
	if review == nil {
		return apperrors.New("REVIEW_NOT_FOUND", "Review not found", http.StatusNotFound)
	}

	provider, err := uc.userRepo.GetByID(ctx, review.ToID)
	if err != nil {
		return apperrors.ErrUserNotFound
	}
	if err := uc.reviewRepo.Delete(ctx, review.ID); err != nil {
		return apperrors.ErrInternalServer
	}

	uc.updateProviderRating(ctx, provider.ID, provider.Role)
	return nil
}

func (uc *ReviewUseCase) UpdateReviewForOrder(
	ctx context.Context,
	fromID string,
	orderID string,
	req *domain.CreateReviewRequest,
) (*domain.ReviewResponse, error) {
	order, err := uc.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, apperrors.ErrOrderNotFound
	}
	if order.Status != domain.OrderStatusCompleted {
		return nil, apperrors.New("REVIEW_ORDER_NOT_COMPLETED", "Review is available after the order is completed", http.StatusBadRequest)
	}
	if order.CustomerID != fromID {
		return nil, apperrors.New("REVIEW_FORBIDDEN", "Only the review author can edit this review", http.StatusForbidden)
	}

	review, err := uc.reviewRepo.GetByOrderAndFromID(ctx, orderID, fromID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if review == nil {
		return nil, apperrors.New("REVIEW_NOT_FOUND", "Review not found", http.StatusNotFound)
	}
	if req.Rating < 1 || req.Rating > 5 {
		return nil, apperrors.New("REVIEW_RATING_INVALID", "Rating must be between 1 and 5", http.StatusBadRequest)
	}

	comment := strings.TrimSpace(req.Comment)
	if len(comment) > 2000 {
		return nil, apperrors.New("REVIEW_COMMENT_TOO_LONG", "Comment must be 2000 characters or fewer", http.StatusBadRequest)
	}

	review.Rating = req.Rating
	review.Comment = comment
	review.Tags = normalizeReviewTags(req.Tags)
	if err := uc.reviewRepo.Update(ctx, review); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	provider, err := uc.userRepo.GetByID(ctx, review.ToID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}
	uc.updateProviderRating(ctx, provider.ID, provider.Role)

	return uc.reviewToResponse(review), nil
}

func (uc *ReviewUseCase) GetReviewsByToID(ctx context.Context, toID string) ([]*domain.ReviewResponse, error) {
	reviews, err := uc.reviewRepo.GetByToID(ctx, toID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	responses := make([]*domain.ReviewResponse, len(reviews))
	for i, review := range reviews {
		responses[i] = uc.reviewToResponse(review)
	}
	return responses, nil
}

func (uc *ReviewUseCase) updateProviderRating(ctx context.Context, userID string, role domain.UserRole) {
	reviews, err := uc.reviewRepo.GetByToID(ctx, userID)
	if err != nil {
		return
	}

	totalRating := 0.0
	for _, review := range reviews {
		totalRating += float64(review.Rating)
	}

	rating := float32(0)
	if len(reviews) > 0 {
		rating = float32(totalRating / float64(len(reviews)))
	}

	switch role {
	case domain.RoleMaster:
		if provider, getErr := uc.masterRepo.GetByUserID(ctx, userID); getErr == nil {
			provider.Rating, provider.ReviewsCount = rating, len(reviews)
			_ = uc.masterRepo.Update(ctx, provider)
		}
	case domain.RoleAutoWash:
		if provider, getErr := uc.autoWashRepo.GetByUserID(ctx, userID); getErr == nil {
			provider.Rating, provider.ReviewsCount = rating, len(reviews)
			_ = uc.autoWashRepo.Update(ctx, provider)
		}
	case domain.RoleAutoShop:
		if provider, getErr := uc.autoShopRepo.GetByUserID(ctx, userID); getErr == nil {
			provider.Rating, provider.ReviewsCount = rating, len(reviews)
			_ = uc.autoShopRepo.Update(ctx, provider)
		}
	case domain.RoleAutoService:
		if provider, getErr := uc.autoServiceRepo.GetByUserID(ctx, userID); getErr == nil {
			provider.Rating, provider.ReviewsCount = rating, len(reviews)
			_ = uc.autoServiceRepo.Update(ctx, provider)
		}
	}
}

func normalizeReviewTags(tags []string) []string {
	allowed := map[string]struct{}{
		"Качество работы":               {},
		"Соблюдение сроков":             {},
		"Цена соответствует результату": {},
		"Вежливость":                    {},
		"Профессионализм":               {},
	}
	seen := make(map[string]struct{}, len(tags))
	result := make([]string, 0, 5)
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if _, ok := allowed[tag]; !ok {
			continue
		}
		if _, ok := seen[tag]; ok {
			continue
		}
		seen[tag] = struct{}{}
		result = append(result, tag)
		if len(result) == 5 {
			break
		}
	}
	return result
}

func (uc *ReviewUseCase) reviewToResponse(review *domain.Review) *domain.ReviewResponse {
	var fromResp, toResp *domain.UserResponse

	if review.From != nil {
		fromResp = buildUserResponse(review.From)
	}

	if review.To != nil {
		toResp = buildUserResponse(review.To)
	}

	return &domain.ReviewResponse{
		ID:        review.ID,
		FromID:    review.FromID,
		From:      fromResp,
		ToID:      review.ToID,
		To:        toResp,
		Rating:    review.Rating,
		Comment:   review.Comment,
		Tags:      []string(review.Tags),
		OrderID:   review.OrderID,
		CreatedAt: review.CreatedAt.Format(time.RFC3339),
	}
}
