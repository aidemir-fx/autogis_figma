package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/repository"
	"github.com/lib/pq"
)

// MasterUseCase handles master-related operations.
// Поддерживает одновременно legacy-модель (activity_types + user_activity_types) и новую
// иерархию (activity_groups + activity_subtypes + user_activity_profiles) — см. spec §8.3.
type MasterUseCase struct {
	userRepo                repository.UserRepository
	masterRepo              repository.MasterRepository
	autoWashRepo            repository.AutoWashRepository
	autoShopRepo            repository.AutoShopRepository
	autoServiceRepo         repository.AutoServiceRepository
	activityTypeRepo        repository.ActivityTypeRepository
	userActivityTypeRepo    repository.UserActivityTypeRepository
	activityGroupRepo       repository.ActivityGroupRepository
	activitySubtypeRepo     repository.ActivitySubtypeRepository
	userActivityProfileRepo repository.UserActivityProfileRepository
	activityAuditLogRepo    repository.ActivityAuditLogRepository
}

func NewMasterUseCase(
	userRepo repository.UserRepository,
	masterRepo repository.MasterRepository,
	autoWashRepo repository.AutoWashRepository,
	autoShopRepo repository.AutoShopRepository,
	autoServiceRepo repository.AutoServiceRepository,
	activityTypeRepo repository.ActivityTypeRepository,
	userActivityTypeRepo repository.UserActivityTypeRepository,
	activityGroupRepo repository.ActivityGroupRepository,
	activitySubtypeRepo repository.ActivitySubtypeRepository,
	userActivityProfileRepo repository.UserActivityProfileRepository,
	activityAuditLogRepo repository.ActivityAuditLogRepository,
) *MasterUseCase {
	return &MasterUseCase{
		userRepo:                userRepo,
		masterRepo:              masterRepo,
		autoWashRepo:            autoWashRepo,
		autoShopRepo:            autoShopRepo,
		autoServiceRepo:         autoServiceRepo,
		activityTypeRepo:        activityTypeRepo,
		userActivityTypeRepo:    userActivityTypeRepo,
		activityGroupRepo:       activityGroupRepo,
		activitySubtypeRepo:     activitySubtypeRepo,
		userActivityProfileRepo: userActivityProfileRepo,
		activityAuditLogRepo:    activityAuditLogRepo,
	}
}

// RegisterMaster creates a new master/business profile and links activity classification.
// Поддерживает два варианта входа:
//  1. Новый: activityGroupCode + activitySubtypeCode.
//  2. Legacy: activityType (master|auto_wash|auto_service|auto_shop).
func (uc *MasterUseCase) RegisterMaster(
	ctx context.Context,
	userID string,
	req *domain.RegisterActivityRequest,
) (*domain.ActivityRegistrationResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	group, subtype, legacyTypeName, err := uc.resolveActivity(ctx, req)
	if err != nil {
		return nil, err
	}

	// Subtype-specific доменные правила (напр. self_service требует box_count>=1).
	if subtype != nil {
		if verr := validateSubtypeFields(subtype.Code, req); verr != nil {
			return nil, verr
		}
	}

	// Legacy activity_type (обязателен для обратной совместимости legacy-клиентов).
	activityType, err := uc.activityTypeRepo.GetByName(ctx, legacyTypeName)
	if err != nil {
		return nil, apperrors.New("ACTIVITY_TYPE_NOT_FOUND", "Activity type not found", 404)
	}

	switch legacyTypeName {
	case "master":
		return uc.registerMaster(ctx, user, activityType, group, subtype, req)
	case "auto_wash":
		return uc.registerAutoWash(ctx, user, activityType, group, subtype, req)
	case "auto_shop":
		return uc.registerAutoShop(ctx, user, activityType, group, subtype, req)
	case "auto_service":
		return uc.registerAutoService(ctx, user, activityType, group, subtype, req)
	default:
		return nil, apperrors.New("ACTIVITY_TYPE_NOT_SUPPORTED", "Unsupported activity type", 400)
	}
}

// ActivateFromBusinessApplication creates the initial provider profile from
// the activation form and immediately enables the professional account.
// Detailed settings can be completed later from the professional cabinet.
func (uc *MasterUseCase) ActivateFromBusinessApplication(
	ctx context.Context,
	userID string,
	app *domain.ProfessionalApplication,
	revision *domain.ProfessionalApplicationRevision,
) error {
	if app == nil || app.UserID != userID || app.ActivityGroupCode == nil || app.ActivitySubtypeCode == nil {
		return apperrors.New("INVALID_APPLICATION", "Некорректные данные профессиональной заявки", 400)
	}
	name := html.UnescapeString(strings.TrimSpace(app.ApplicantDisplayName))
	if revision != nil && app.ActivityGroupCode != nil && *app.ActivityGroupCode != "private_executor" {
		if raw, ok := revision.PayloadJSON["businessName"].(string); ok {
			if businessName := strings.TrimSpace(html.UnescapeString(raw)); businessName != "" {
				name = businessName
			}
		}
	}
	if name == "" {
		name = "Профессиональный исполнитель"
	}
	address := ""
	if app.City != nil {
		address = *app.City
	}
	workFrom := "08:00"
	workTo := "18:00"
	workingDays := []bool{true, true, true, true, true, false, false}
	req := &domain.RegisterActivityRequest{
		ActivityGroupCode:   *app.ActivityGroupCode,
		ActivitySubtypeCode: *app.ActivitySubtypeCode,
		FullName:            &name,
		WorkingPhone:        stringPtr(app.ContactPhone),
		Address:             &address,
		WorkFrom:            &workFrom,
		WorkTo:              &workTo,
		WorkingDays:         &workingDays,
	}
	// Форма бизнес-регистрации пока не запрашивает количество боксов.
	// Для самомойки используем минимальное валидное значение, чтобы заявка
	// могла активировать профиль, а владелец позже изменил его в настройках.
	if *app.ActivityGroupCode == "auto_wash" && *app.ActivitySubtypeCode == "self_service" {
		defaultBoxCount := 1
		req.BoxCount = &defaultBoxCount
	}
	if revision != nil {
		if raw, ok := revision.PayloadJSON["address"].(string); ok && strings.TrimSpace(raw) != "" {
			req.Address = stringPtr(strings.TrimSpace(html.UnescapeString(raw)))
		}
		if raw, ok := revision.PayloadJSON["comment"].(string); ok && strings.TrimSpace(raw) != "" {
			req.Description = stringPtr(strings.TrimSpace(html.UnescapeString(raw)))
		}
	}
	if _, err := uc.RegisterMaster(ctx, userID, req); err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok && appErr.Code == "MASTER_ALREADY_EXISTS" {
			user, userErr := uc.userRepo.GetByID(ctx, userID)
			if userErr != nil {
				return apperrors.ErrUserNotFound
			}
			user.IsProfessional = true
			return uc.userRepo.Update(ctx, user)
		}
		return err
	}
	return nil
}

// resolveActivity маппит вход (новые коды или legacy activityType) в (group, subtype, legacyName).
func (uc *MasterUseCase) resolveActivity(
	ctx context.Context,
	req *domain.RegisterActivityRequest,
) (*domain.ActivityGroup, *domain.ActivitySubtype, string, error) {
	groupCode := req.ActivityGroupCode
	subtypeCode := req.ActivitySubtypeCode

	// Legacy-fallback: если новые коды не заданы — вывести их из activityType.
	if groupCode == "" && subtypeCode == "" {
		switch req.ActivityType {
		case "master":
			groupCode, subtypeCode = "private_executor", "master"
		case "auto_wash":
			groupCode, subtypeCode = "auto_wash", "classic"
		case "auto_service":
			groupCode, subtypeCode = "auto_service", "general_service"
		case "auto_shop":
			groupCode, subtypeCode = "auto_shop", "general"
		default:
			return nil, nil, "", apperrors.New("ACTIVITY_TYPE_NOT_SUPPORTED", "Unsupported activity type", 400)
		}
	}

	if groupCode == "" || subtypeCode == "" {
		return nil, nil, "", apperrors.New(
			"INVALID_ACTIVITY_CODES",
			"Both activityGroupCode and activitySubtypeCode must be provided",
			400,
		)
	}

	group, err := uc.activityGroupRepo.GetByCode(ctx, groupCode)
	if err != nil {
		return nil, nil, "", apperrors.New("ACTIVITY_GROUP_NOT_FOUND", "Activity group not found", 404)
	}
	if !group.IsActive {
		return nil, nil, "", apperrors.New("ACTIVITY_GROUP_DISABLED", "Activity group is disabled", 409)
	}

	subtype, err := uc.activitySubtypeRepo.GetByGroupAndCode(ctx, group.ID, subtypeCode)
	if err != nil {
		return nil, nil, "", apperrors.New(
			"ACTIVITY_SUBTYPE_NOT_FOUND",
			"Activity subtype not found in the specified group",
			404,
		)
	}
	if !subtype.IsActive {
		return nil, nil, "", apperrors.New("ACTIVITY_SUBTYPE_DISABLED", "Activity subtype is disabled", 409)
	}

	legacyTypeName := groupToLegacyActivityType(group.Code)
	return group, subtype, legacyTypeName, nil
}

// groupToLegacyActivityType — явный маппинг group.Code → legacy activity_types.name.
func groupToLegacyActivityType(groupCode string) string {
	switch groupCode {
	case "private_executor":
		return "master"
	case "auto_wash":
		return "auto_wash"
	case "auto_service":
		return "auto_service"
	default:
		return groupCode
	}
}

// groupToUserRole — явный маппинг group.Code → UserRole. Держим отдельно от legacy-маппинга,
// чтобы в будущем роли могли отличаться от activity_type.
func groupToUserRole(groupCode string) domain.UserRole {
	switch groupCode {
	case "private_executor":
		return domain.RoleMaster
	case "auto_wash":
		return domain.RoleAutoWash
	case "auto_service":
		return domain.RoleAutoService
	case "auto_shop":
		return domain.RoleAutoShop
	default:
		return domain.RoleMaster
	}
}

// validateSubtypeFields — subtype-specific валидация RegisterActivityRequest.
// Используется диспатчер по code, чтобы легко добавлять новые подтипы.
func validateSubtypeFields(subtypeCode string, req *domain.RegisterActivityRequest) *apperrors.AppError {
	switch subtypeCode {
	case "self_service":
		if req.BoxCount == nil || *req.BoxCount < 1 {
			return apperrors.New(
				"VALIDATION_FAILED",
				"boxCount must be >= 1 for self_service auto wash",
				400,
			)
		}
	case "classic":
		if req.WasherCount != nil && *req.WasherCount < 0 {
			return apperrors.New("VALIDATION_FAILED", "washerCount cannot be negative", 400)
		}
	}
	return nil
}

func subtypeIDPtr(s *domain.ActivitySubtype) *string {
	if s == nil {
		return nil
	}
	id := s.ID
	return &id
}

// upsertUserActivityProfile сохраняет запись в source-of-truth таблице user_activity_profiles.
// Первый созданный профиль автоматически помечается primary.
func (uc *MasterUseCase) upsertUserActivityProfile(
	ctx context.Context,
	userID string,
	group *domain.ActivityGroup,
	subtype *domain.ActivitySubtype,
) error {
	if group == nil || subtype == nil {
		return nil
	}

	existing, _ := uc.userActivityProfileRepo.GetByUserID(ctx, userID)
	isPrimary := len(existing) == 0

	profile := &domain.UserActivityProfile{
		UserID:            userID,
		ActivityGroupID:   group.ID,
		ActivitySubtypeID: subtype.ID,
		IsPrimary:         isPrimary,
	}
	if err := uc.userActivityProfileRepo.UpsertIdempotent(ctx, profile); err != nil {
		return apperrors.ErrInternalServer
	}
	return nil
}

// writeAuditLog — non-fatal: ошибку журналируем в лог usecase, но не прерываем регистрацию
// (см. spec §10.5). Поля old/new сериализуем в JSON.
func (uc *MasterUseCase) writeAuditLog(
	ctx context.Context,
	actorUserID, subjectUserID, action string,
	oldVal, newVal interface{},
) {
	if uc.activityAuditLogRepo == nil {
		return
	}
	var oldJSON, newJSON *string
	if oldVal != nil {
		if b, err := json.Marshal(oldVal); err == nil {
			s := string(b)
			oldJSON = &s
		}
	}
	if newVal != nil {
		if b, err := json.Marshal(newVal); err == nil {
			s := string(b)
			newJSON = &s
		}
	}
	entry := &domain.ActivityAuditLog{
		SubjectUserID: subjectUserID,
		Action:        action,
		OldValue:      oldJSON,
		NewValue:      newJSON,
	}
	if actorUserID != "" {
		entry.ActorUserID = &actorUserID
	}
	_ = uc.activityAuditLogRepo.Create(ctx, entry)
}

func (uc *MasterUseCase) registerMaster(
	ctx context.Context,
	user *domain.User,
	activityType *domain.ActivityType,
	group *domain.ActivityGroup,
	subtype *domain.ActivitySubtype,
	req *domain.RegisterActivityRequest,
) (*domain.ActivityRegistrationResponse, error) {
	existingMaster, _ := uc.masterRepo.GetByUserID(ctx, user.ID)
	if existingMaster != nil {
		return nil, apperrors.New("MASTER_ALREADY_EXISTS", "Master profile already exists for this user", 400)
	}

	master := &domain.Master{
		UserID:               user.ID,
		FullName:             req.FullName,
		WorkingPhone:         req.WorkingPhone,
		Description:          req.Description,
		Address:              req.Address,
		Coordinates:          req.Coordinates,
		Status:               "schedule",
		CurrentStatus:        "unavailable",
		OnlineBookingEnabled: false,
		Rating:               0,
		ReviewsCount:         0,
		Professions:          pq.StringArray{},
		AutoMarks:            pq.StringArray{},
		Payments:             pq.StringArray{},
		WorkingDays:          pq.StringArray{},
		ActivitySubtypeID:    subtypeIDPtr(subtype),
	}

	if req.Professions != nil {
		master.Professions = pq.StringArray(*req.Professions)
	}
	if req.AutoMarks != nil {
		master.AutoMarks = pq.StringArray(*req.AutoMarks)
	}
	if req.Payments != nil {
		master.Payments = pq.StringArray(req.Payments)
	}
	if req.WorkingDays != nil {
		days := make([]string, len(*req.WorkingDays))
		for i, v := range *req.WorkingDays {
			if v {
				days[i] = "true"
			} else {
				days[i] = "false"
			}
		}
		master.WorkingDays = pq.StringArray(days)
	}

	if req.WorkFrom != nil {
		master.WorkFrom = req.WorkFrom
	}
	if req.WorkTo != nil {
		master.WorkTo = req.WorkTo
	}
	if req.OnlineBookingEnabled != nil {
		master.OnlineBookingEnabled = *req.OnlineBookingEnabled
	}
	if err := uc.masterRepo.Create(ctx, master); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	if err := uc.linkActivityToUser(ctx, user.ID, activityType.ID); err != nil {
		return nil, err
	}
	if err := uc.upsertUserActivityProfile(ctx, user.ID, group, subtype); err != nil {
		return nil, err
	}

	role := domain.RoleMaster
	if group != nil {
		role = groupToUserRole(group.Code)
	}
	if err := uc.updateUserRoleIfNeeded(ctx, user, role); err != nil {
		return nil, err
	}

	uc.writeAuditLog(ctx, user.ID, user.ID, "activity_profile_created", nil, map[string]interface{}{
		"profile_kind":  "master",
		"subtype_code":  codeOrEmpty(subtype),
		"group_code":    groupCodeOrEmpty(group),
		"activity_type": activityType.Name,
	})

	return &domain.ActivityRegistrationResponse{
		Success: true,
		Message: "Master profile registered successfully",
		ID:      master.ID,
		Type:    "master",
		Data: domain.MasterProfileResponse{
			ID:                   master.ID,
			UserID:               master.UserID,
			FullName:             master.FullName,
			WorkingPhone:         master.WorkingPhone,
			Description:          master.Description,
			Address:              master.Address,
			Coordinates:          master.Coordinates,
			Status:               master.Status,
			CurrentStatus:        master.CurrentStatus,
			OnlineBookingEnabled: master.OnlineBookingEnabled,
			Rating:               master.Rating,
			ReviewsCount:         master.ReviewsCount,
			ActivityGroup:        groupToRef(group),
			ActivitySubtype:      subtypeToRef(subtype),
		},
	}, nil
}

func (uc *MasterUseCase) linkActivityToUser(ctx context.Context, userID, activityTypeID string) error {
	userActivityType := &domain.UserActivityType{
		UserID:         userID,
		ActivityTypeID: activityTypeID,
	}
	if err := uc.userActivityTypeRepo.Create(ctx, userActivityType); err != nil {
		return apperrors.ErrInternalServer
	}
	return nil
}

// updateUserRoleIfNeeded назначает пользователю роль, соответствующую
// зарегистрированной активности, и включает профессиональный статус.
// Отзыв статуса выполняется отдельным админским действием.
func (uc *MasterUseCase) updateUserRoleIfNeeded(ctx context.Context, user *domain.User, role domain.UserRole) error {
	if user.Role == role && user.IsProfessional {
		return nil
	}
	user.Role = role
	user.IsProfessional = true
	if err := uc.userRepo.Update(ctx, user); err != nil {
		return apperrors.ErrInternalServer
	}
	return nil
}

func (uc *MasterUseCase) registerAutoWash(
	ctx context.Context,
	user *domain.User,
	activityType *domain.ActivityType,
	group *domain.ActivityGroup,
	subtype *domain.ActivitySubtype,
	req *domain.RegisterActivityRequest,
) (*domain.ActivityRegistrationResponse, error) {
	existing, _ := uc.autoWashRepo.GetByUserID(ctx, user.ID)
	if existing != nil {
		return nil, apperrors.New("AUTO_WASH_ALREADY_EXISTS", "Auto wash profile already exists for this user", 400)
	}

	profile := &domain.AutoWash{
		UserID:               user.ID,
		FullName:             req.FullName,
		WorkingPhone:         req.WorkingPhone,
		Description:          req.Description,
		Address:              req.Address,
		Coordinates:          req.Coordinates,
		Status:               "schedule",
		OnlineBookingEnabled: false,
		WorkFrom:             req.WorkFrom,
		WorkTo:               req.WorkTo,
		WorkingDays:          pq.StringArray{},
		Services:             pq.StringArray{},
		ActivitySubtypeID:    subtypeIDPtr(subtype),
	}
	if profile.WorkFrom == nil {
		profile.WorkFrom = stringPtr("08:00")
	}
	if profile.WorkTo == nil {
		profile.WorkTo = stringPtr("18:00")
	}
	if req.WorkingDays != nil {
		profile.WorkingDays = boolDaysToString(*req.WorkingDays)
	}
	if req.Services != nil {
		profile.Services = pq.StringArray(*req.Services)
	}
	if req.BoxCount != nil {
		profile.BoxCount = req.BoxCount
	}
	if req.WasherCount != nil {
		profile.WasherCount = req.WasherCount
	}
	if req.HasWaitingArea != nil {
		profile.HasWaitingArea = *req.HasWaitingArea
	}
	if req.Payments != nil {
		profile.Payments = pq.StringArray(req.Payments)
	}
	profile.OnlineBookingEnabled = false

	if err := uc.autoWashRepo.Create(ctx, profile); err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if err := uc.linkActivityToUser(ctx, user.ID, activityType.ID); err != nil {
		return nil, err
	}
	if err := uc.upsertUserActivityProfile(ctx, user.ID, group, subtype); err != nil {
		return nil, err
	}

	role := domain.RoleAutoWash
	if group != nil {
		role = groupToUserRole(group.Code)
	}
	if err := uc.updateUserRoleIfNeeded(ctx, user, role); err != nil {
		return nil, err
	}

	uc.writeAuditLog(ctx, user.ID, user.ID, "activity_profile_created", nil, map[string]interface{}{
		"profile_kind":  "auto_wash",
		"subtype_code":  codeOrEmpty(subtype),
		"group_code":    groupCodeOrEmpty(group),
		"activity_type": activityType.Name,
	})

	return &domain.ActivityRegistrationResponse{
		Success: true,
		Message: "Auto wash profile registered successfully",
		ID:      profile.ID,
		Type:    "auto_wash",
		Data: domain.AutoWashResponse{
			ID:                   profile.ID,
			UserID:               profile.UserID,
			Status:               profile.Status,
			OnlineBookingEnabled: profile.OnlineBookingEnabled,
			LiveQueueEnabled:     profile.LiveQueueEnabled,
			Services:             []string(profile.Services),
			BoxCount:             profile.BoxCount,
			WasherCount:          profile.WasherCount,
			HasWaitingArea:       profile.HasWaitingArea,
			Payments:             []string(profile.Payments),
			ActivityGroup:        groupToRef(group),
			ActivitySubtype:      subtypeToRef(subtype),
			CreatedAt:            profile.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

func (uc *MasterUseCase) registerAutoShop(
	ctx context.Context,
	user *domain.User,
	activityType *domain.ActivityType,
	group *domain.ActivityGroup,
	subtype *domain.ActivitySubtype,
	req *domain.RegisterActivityRequest,
) (*domain.ActivityRegistrationResponse, error) {
	existing, _ := uc.autoShopRepo.GetByUserID(ctx, user.ID)
	if existing != nil {
		return nil, apperrors.New("AUTO_SHOP_ALREADY_EXISTS", "Auto shop profile already exists for this user", 400)
	}

	profile := &domain.AutoShop{
		UserID:               user.ID,
		FullName:             req.FullName,
		WorkingPhone:         req.WorkingPhone,
		Description:          req.Description,
		Address:              req.Address,
		Coordinates:          req.Coordinates,
		Status:               "schedule",
		OnlineBookingEnabled: false,
		WorkFrom:             req.WorkFrom,
		WorkTo:               req.WorkTo,
		WorkingDays:          pq.StringArray{},
		Services:             pq.StringArray{},
		Payments:             pq.StringArray{},
	}
	if profile.WorkFrom == nil {
		profile.WorkFrom = stringPtr("08:00")
	}
	if profile.WorkTo == nil {
		profile.WorkTo = stringPtr("18:00")
	}
	if req.WorkingDays != nil {
		profile.WorkingDays = boolDaysToString(*req.WorkingDays)
	}
	if req.Services != nil {
		profile.Services = pq.StringArray(*req.Services)
	}
	if req.Payments != nil {
		profile.Payments = pq.StringArray(req.Payments)
	}
	if req.OnlineBookingEnabled != nil {
		profile.OnlineBookingEnabled = *req.OnlineBookingEnabled
	}
	if err := uc.autoShopRepo.Create(ctx, profile); err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if err := uc.linkActivityToUser(ctx, user.ID, activityType.ID); err != nil {
		return nil, err
	}
	if err := uc.upsertUserActivityProfile(ctx, user.ID, group, subtype); err != nil {
		return nil, err
	}

	role := domain.RoleAutoShop
	if group != nil {
		role = groupToUserRole(group.Code)
	}
	if err := uc.updateUserRoleIfNeeded(ctx, user, role); err != nil {
		return nil, err
	}

	uc.writeAuditLog(ctx, user.ID, user.ID, "activity_profile_created", nil, map[string]interface{}{
		"profile_kind":  "auto_shop",
		"subtype_code":  codeOrEmpty(subtype),
		"group_code":    groupCodeOrEmpty(group),
		"activity_type": activityType.Name,
	})

	return &domain.ActivityRegistrationResponse{
		Success: true,
		Message: "Auto shop profile registered successfully",
		ID:      profile.ID,
		Type:    "auto_shop",
		Data: domain.AutoShopResponse{
			ID:                   profile.ID,
			UserID:               profile.UserID,
			Status:               profile.Status,
			OnlineBookingEnabled: profile.OnlineBookingEnabled,
			Services:             []string(profile.Services),
			Payments:             []string(profile.Payments),
			ActivityGroup:        groupToRef(group),
			ActivitySubtype:      subtypeToRef(subtype),
			CreatedAt:            profile.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

func (uc *MasterUseCase) registerAutoService(
	ctx context.Context,
	user *domain.User,
	activityType *domain.ActivityType,
	group *domain.ActivityGroup,
	subtype *domain.ActivitySubtype,
	req *domain.RegisterActivityRequest,
) (*domain.ActivityRegistrationResponse, error) {
	existing, _ := uc.autoServiceRepo.GetByUserID(ctx, user.ID)
	if existing != nil {
		return nil, apperrors.New("AUTO_SERVICE_ALREADY_EXISTS", "Auto service profile already exists for this user", 400)
	}

	profile := &domain.AutoService{
		UserID:               user.ID,
		FullName:             req.FullName,
		WorkingPhone:         req.WorkingPhone,
		Description:          req.Description,
		Address:              req.Address,
		Coordinates:          req.Coordinates,
		Status:               "schedule",
		OnlineBookingEnabled: false,
		WorkFrom:             req.WorkFrom,
		WorkTo:               req.WorkTo,
		Services:             pq.StringArray{},
		Payments:             pq.StringArray{},
		Professions:          pq.StringArray{},
		WorkingDays:          pq.StringArray{},
		HasParking:           false,
		LiftCount:            0,
		Warranty:             false,
		Hotline:              nil,
		BrandSupport:         pq.StringArray{},
		ActivitySubtypeID:    subtypeIDPtr(subtype),
	}

	if req.Services != nil {
		profile.Services = pq.StringArray(*req.Services)
	}
	if req.Professions != nil {
		profile.Professions = pq.StringArray(*req.Professions)
	}
	if req.WorkingDays != nil {
		days := make([]string, len(*req.WorkingDays))
		for i, v := range *req.WorkingDays {
			if v {
				days[i] = "true"
			} else {
				days[i] = "false"
			}
		}
		profile.WorkingDays = pq.StringArray(days)
	}

	if req.HasParking != nil {
		profile.HasParking = *req.HasParking
	}
	if req.LiftCount != nil {
		profile.LiftCount = *req.LiftCount
	}
	if req.Warranty != nil {
		profile.Warranty = *req.Warranty
	}
	if req.Hotline != nil {
		profile.Hotline = req.Hotline
	}
	if req.BrandSupport != nil {
		profile.BrandSupport = pq.StringArray(req.BrandSupport)
	}
	if req.Payments != nil {
		profile.Payments = pq.StringArray(req.Payments)
	}
	if req.OnlineBookingEnabled != nil {
		profile.OnlineBookingEnabled = *req.OnlineBookingEnabled
	}

	if err := uc.autoServiceRepo.Create(ctx, profile); err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if err := uc.linkActivityToUser(ctx, user.ID, activityType.ID); err != nil {
		return nil, err
	}
	if err := uc.upsertUserActivityProfile(ctx, user.ID, group, subtype); err != nil {
		return nil, err
	}

	role := domain.RoleAutoService
	if group != nil {
		role = groupToUserRole(group.Code)
	}
	if err := uc.updateUserRoleIfNeeded(ctx, user, role); err != nil {
		return nil, err
	}

	uc.writeAuditLog(ctx, user.ID, user.ID, "activity_profile_created", nil, map[string]interface{}{
		"profile_kind":  "auto_service",
		"subtype_code":  codeOrEmpty(subtype),
		"group_code":    groupCodeOrEmpty(group),
		"activity_type": activityType.Name,
	})

	return &domain.ActivityRegistrationResponse{
		Success: true,
		Message: "Auto service profile registered successfully",
		ID:      profile.ID,
		Type:    "auto_service",
		Data: domain.AutoServiceResponse{
			ID:                   profile.ID,
			UserID:               profile.UserID,
			Status:               profile.Status,
			OnlineBookingEnabled: profile.OnlineBookingEnabled,
			Services:             []string(profile.Services),
			Professions:          []string(profile.Professions),
			ActivityGroup:        groupToRef(group),
			ActivitySubtype:      subtypeToRef(subtype),
			CreatedAt:            profile.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

// GetMasterProfile returns master profile for a user
func (uc *MasterUseCase) GetMasterProfile(
	ctx context.Context,
	userID string,
) (*domain.MasterProfileResponse, error) {
	master, err := uc.masterRepo.GetByUserID(ctx, userID)
	if err != nil {
		// A professional application can grant access to PRO before the
		// legacy master row exists. Create an editable empty profile on the
		// first visit instead of returning 404 from the settings screen.
		master = &domain.Master{
			UserID:        userID,
			Status:        "schedule",
			CurrentStatus: "unavailable",
			WorkingDays:   pq.StringArray{},
			Professions:   pq.StringArray{},
			AutoMarks:     pq.StringArray{},
		}
		if err := uc.masterRepo.Create(ctx, master); err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}

	return uc.buildMasterProfileResponse(ctx, master)
}

func (uc *MasterUseCase) GetMasterByID(
	ctx context.Context,
	id string,
) (*domain.MasterProfileResponse, error) {
	master, err := uc.masterRepo.GetByID(ctx, id)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}

	return uc.buildMasterProfileResponse(ctx, master)
}

func (uc *MasterUseCase) GetAllMasters(
	ctx context.Context,
) ([]*domain.MasterProfileResponse, error) {
	masters, err := uc.masterRepo.GetAll(ctx)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}

	response := make([]*domain.MasterProfileResponse, 0, len(masters))
	for _, master := range masters {
		item, err := uc.buildMasterProfileResponse(ctx, master)
		if err != nil {
			return nil, err
		}
		response = append(response, item)
	}

	return response, nil
}

func (uc *MasterUseCase) buildMasterProfileResponse(
	ctx context.Context,
	master *domain.Master,
) (*domain.MasterProfileResponse, error) {
	if master == nil {
		return nil, apperrors.ErrNotFound
	}

	userActivityTypes, _ := uc.userActivityTypeRepo.GetByUserID(ctx, master.UserID)
	var activityTypes []domain.ActivityTypeResponse
	for _, uat := range userActivityTypes {
		if uat.ActivityType != nil {
			activityTypes = append(activityTypes, *mapActivityTypeToResponse(uat.ActivityType))
		}
	}

	groupRef, subtypeRef := uc.hydrateActivityRefs(ctx, master.ActivitySubtypeID)
	workingDays := stringDaysToBool(master.WorkingDays)

	return &domain.MasterProfileResponse{
		ID:                   master.ID,
		UserID:               master.UserID,
		FullName:             master.FullName,
		WorkingPhone:         master.WorkingPhone,
		Description:          master.Description,
		Address:              master.Address,
		Coordinates:          master.Coordinates,
		CoverImageAssetID:    master.CoverImageAssetID,
		Status:               master.Status,
		CurrentStatus:        resolveProviderCurrentStatus(master.Status, workingDays, master.WorkFrom, master.WorkTo, time.Now()),
		OnlineBookingEnabled: master.OnlineBookingEnabled,
		LiveQueueEnabled:     master.LiveQueueEnabled,
		Rating:               master.Rating,
		ReviewsCount:         master.ReviewsCount,
		WorkFrom:             master.WorkFrom,
		WorkTo:               master.WorkTo,
		WorkingDays:          workingDays,
		User:                 uc.userToResponse(master.User),
		Professions:          master.Professions,
		Services:             master.Services,
		AutoMarks:            master.AutoMarks,
		Payments:             []string(master.Payments),
		HasParking:           master.HasParking,
		HasWifi:              master.HasWifi,
		HasWaitingArea:       master.HasWaitingArea,
		OffersCoffee:         master.OffersCoffee,
		HasEvacuation:        master.HasEvacuation,
		HasPartsInStock:      master.HasPartsInStock,
		LiftCount:            master.LiftCount,
		ActivityTypes:        activityTypes,
		ActivityGroup:        groupRef,
		ActivitySubtype:      subtypeRef,
		CreatedAt:            master.CreatedAt.Format(time.RFC3339),
	}, nil
}

// hydrateActivityRefs — по activity_subtype_id поднимает (group, subtype) и возвращает refs
// для ответа. При отсутствии ссылки возвращает (nil, nil). Ошибки чтения глушатся, чтобы не
// ломать основной ответ (иерархия — вспомогательная информация).
func (uc *MasterUseCase) hydrateActivityRefs(
	ctx context.Context,
	subtypeID *string,
) (*domain.ActivityGroupRef, *domain.ActivitySubtypeRef) {
	if subtypeID == nil || *subtypeID == "" || uc.activitySubtypeRepo == nil {
		return nil, nil
	}
	subtype, err := uc.activitySubtypeRepo.GetByID(ctx, *subtypeID)
	if err != nil || subtype == nil {
		return nil, nil
	}

	var groupRef *domain.ActivityGroupRef
	if subtype.Group != nil {
		groupRef = groupToRef(subtype.Group)
	} else if uc.activityGroupRepo != nil {
		if grp, gerr := uc.activityGroupRepo.GetByID(ctx, subtype.GroupID); gerr == nil {
			groupRef = groupToRef(grp)
		}
	}
	return groupRef, subtypeToRef(subtype)
}

func (uc *MasterUseCase) hydrateUserActivityRefs(
	ctx context.Context,
	userID string,
	groupCode string,
) (*domain.ActivityGroupRef, *domain.ActivitySubtypeRef) {
	if userID == "" || uc.userActivityProfileRepo == nil {
		return nil, nil
	}
	profiles, err := uc.userActivityProfileRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, nil
	}
	for _, profile := range profiles {
		if profile == nil || profile.ActivityGroup == nil || profile.ActivitySubtype == nil {
			continue
		}
		if profile.ActivityGroup.Code == groupCode {
			return groupToRef(profile.ActivityGroup), subtypeToRef(profile.ActivitySubtype)
		}
	}
	return nil, nil
}

func groupToRef(g *domain.ActivityGroup) *domain.ActivityGroupRef {
	if g == nil {
		return nil
	}
	return &domain.ActivityGroupRef{
		Code:        g.Code,
		DisplayName: g.DisplayName,
	}
}

func subtypeToRef(s *domain.ActivitySubtype) *domain.ActivitySubtypeRef {
	if s == nil {
		return nil
	}
	return &domain.ActivitySubtypeRef{
		Code:             s.Code,
		DisplayName:      s.DisplayName,
		CabinetSchemaKey: s.CabinetSchemaKey,
	}
}

func codeOrEmpty(s *domain.ActivitySubtype) string {
	if s == nil {
		return ""
	}
	return s.Code
}

func groupCodeOrEmpty(g *domain.ActivityGroup) string {
	if g == nil {
		return ""
	}
	return g.Code
}

// UpdateMasterProfile updates master profile
func (uc *MasterUseCase) UpdateMasterProfile(
	ctx context.Context,
	userID string,
	req *domain.UpdateMasterProfileRequest,
) (*domain.MasterProfileResponse, error) {
	master, err := uc.masterRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}

	if req.FullName != nil {
		master.FullName = req.FullName
	}
	if req.WorkingPhone != nil {
		master.WorkingPhone = req.WorkingPhone
	}
	if req.Description != nil {
		master.Description = req.Description
	}
	if req.Address != nil {
		master.Address = req.Address
	}
	if req.Coordinates != nil {
		master.Coordinates = req.Coordinates
	}
	if req.CoverImageAssetID != nil {
		if *req.CoverImageAssetID == "" {
			master.CoverImageAssetID = nil
		} else {
			master.CoverImageAssetID = req.CoverImageAssetID
		}
	}
	if req.Status != nil {
		status, err := normalizeProviderStatusMode(*req.Status)
		if err != nil {
			return nil, err
		}
		master.Status = status
		master.CurrentStatus = providerStatusUnavailable
	}
	if req.LiveQueueEnabled != nil {
		master.LiveQueueEnabled = *req.LiveQueueEnabled
	}
	if req.OnlineBookingEnabled != nil && !master.LiveQueueEnabled {
		master.OnlineBookingEnabled = *req.OnlineBookingEnabled
	}
	if master.LiveQueueEnabled {
		master.OnlineBookingEnabled = false
	}
	if req.Professions != nil {
		master.Professions = pq.StringArray(req.Professions)
	}
	if req.Services != nil {
		master.Services = pq.StringArray(req.Services)
	}
	if req.AutoMarks != nil {
		master.AutoMarks = pq.StringArray(req.AutoMarks)
	}
	if req.WorkFrom != nil {
		master.WorkFrom = req.WorkFrom
	}
	if req.WorkTo != nil {
		master.WorkTo = req.WorkTo
	}
	if req.WorkingDays != nil {
		master.WorkingDays = boolDaysToString(req.WorkingDays)
	}
	if req.HasParking != nil {
		master.HasParking = *req.HasParking
	}
	if req.HasWifi != nil {
		master.HasWifi = *req.HasWifi
	}
	if req.HasWaitingArea != nil {
		master.HasWaitingArea = *req.HasWaitingArea
	}
	if req.OffersCoffee != nil {
		master.OffersCoffee = *req.OffersCoffee
	}
	if req.HasEvacuation != nil {
		master.HasEvacuation = *req.HasEvacuation
	}
	if req.HasPartsInStock != nil {
		master.HasPartsInStock = *req.HasPartsInStock
	}
	if req.LiftCount != nil {
		master.LiftCount = *req.LiftCount
	}

	if err := uc.masterRepo.Update(ctx, master); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.buildMasterProfileResponse(ctx, master)
}

func (uc *MasterUseCase) userToResponse(user *domain.User) *domain.UserResponse {
	return buildUserResponse(user)
}

func boolDaysToString(days []bool) pq.StringArray {
	result := make([]string, len(days))
	for i, day := range days {
		result[i] = fmt.Sprintf("%t", day)
	}
	return pq.StringArray(result)
}

func stringDaysToBool(days pq.StringArray) []bool {
	result := make([]bool, 0, len(days))
	for _, day := range days {
		result = append(result, day == "true")
	}
	return result
}

func normalizeProviderStatusMode(status string) (string, error) {
	switch status {
	case "", providerStatusSchedule, providerStatusAvailable:
		return providerStatusSchedule, nil
	case providerStatusUnavailable:
		return providerStatusUnavailable, nil
	default:
		return "", apperrors.New("INVALID_PROVIDER_STATUS", "Invalid provider status", 400)
	}
}

func (uc *MasterUseCase) GetAutoServiceProfile(ctx context.Context, userID string) (map[string]interface{}, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	profile, err := uc.autoServiceRepo.GetByUserID(ctx, userID)
	if err != nil {
		profile = &domain.AutoService{UserID: userID, Status: "schedule", Services: pq.StringArray{}, Professions: pq.StringArray{}, WorkingDays: pq.StringArray{}, BrandSupport: pq.StringArray{}}
		if err := uc.autoServiceRepo.Create(ctx, profile); err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}

	groupRef, subtypeRef := uc.hydrateActivityRefs(ctx, profile.ActivitySubtypeID)

	return map[string]interface{}{
		"id":    user.ID,
		"phone": user.Phone,
		"name":  user.Name,
		"role":  user.Role,
		"profile": domain.AutoServiceResponse{
			ID:                   profile.ID,
			UserID:               profile.UserID,
			FullName:             profile.FullName,
			WorkingPhone:         profile.WorkingPhone,
			Description:          profile.Description,
			Address:              profile.Address,
			Coordinates:          profile.Coordinates,
			CoverImageURL:        profile.CoverImageURL,
			CoverImageAssetID:    profile.CoverImageAssetID,
			Status:               profile.Status,
			OnlineBookingEnabled: profile.OnlineBookingEnabled,
			LiveQueueEnabled:     profile.LiveQueueEnabled,
			Services:             []string(profile.Services),
			Professions:          []string(profile.Professions),
			WorkFrom:             profile.WorkFrom,
			WorkTo:               profile.WorkTo,
			WorkingDays:          stringDaysToBool(profile.WorkingDays),
			HasParking:           profile.HasParking,
			LiftCount:            profile.LiftCount,
			Warranty:             profile.Warranty,
			Hotline:              profile.Hotline,
			BrandSupport:         []string(profile.BrandSupport),
			Payments:             []string(profile.Payments),
			ActivityGroup:        groupRef,
			ActivitySubtype:      subtypeRef,
			CreatedAt:            profile.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

func (uc *MasterUseCase) UpdateAutoServiceProfile(ctx context.Context, userID string, req *domain.UpdateAutoServiceRequest) (map[string]interface{}, error) {
	profile, err := uc.autoServiceRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}

	if req.FullName != nil {
		profile.FullName = req.FullName
	}
	if req.WorkingPhone != nil {
		profile.WorkingPhone = req.WorkingPhone
	}
	if req.Description != nil {
		profile.Description = req.Description
	}
	if req.Address != nil {
		profile.Address = req.Address
	}
	if req.Coordinates != nil {
		profile.Coordinates = req.Coordinates
	}
	if req.CoverImageURL != nil {
		profile.CoverImageURL = req.CoverImageURL
	}
	if req.CoverImageAssetID != nil {
		profile.CoverImageAssetID = req.CoverImageAssetID
	}
	if req.Status != nil {
		status, err := normalizeProviderStatusMode(*req.Status)
		if err != nil {
			return nil, err
		}
		profile.Status = status
	}
	if req.LiveQueueEnabled != nil {
		profile.LiveQueueEnabled = *req.LiveQueueEnabled
	}
	if req.OnlineBookingEnabled != nil && !profile.LiveQueueEnabled {
		profile.OnlineBookingEnabled = *req.OnlineBookingEnabled
	}
	if profile.LiveQueueEnabled {
		profile.OnlineBookingEnabled = false
	}
	if req.Services != nil {
		profile.Services = pq.StringArray(req.Services)
	}
	if req.Payments != nil {
		profile.Payments = pq.StringArray(req.Payments)
	}
	if req.Professions != nil {
		profile.Professions = pq.StringArray(req.Professions)
	}
	if req.WorkFrom != nil {
		profile.WorkFrom = req.WorkFrom
	}
	if req.WorkTo != nil {
		profile.WorkTo = req.WorkTo
	}
	if req.WorkingDays != nil {
		profile.WorkingDays = boolDaysToString(req.WorkingDays)
	}
	if req.HasParking != nil {
		profile.HasParking = *req.HasParking
	}
	if req.LiftCount != nil {
		profile.LiftCount = *req.LiftCount
	}
	if req.Warranty != nil {
		profile.Warranty = *req.Warranty
	}
	if req.Hotline != nil {
		profile.Hotline = req.Hotline
	}
	if req.BrandSupport != nil {
		profile.BrandSupport = pq.StringArray(req.BrandSupport)
	}

	if err := uc.autoServiceRepo.Update(ctx, profile); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.GetAutoServiceProfile(ctx, userID)
}

func (uc *MasterUseCase) GetAutoShopProfile(ctx context.Context, userID string) (map[string]interface{}, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	profile, err := uc.autoShopRepo.GetByUserID(ctx, userID)
	if err != nil {
		profile = &domain.AutoShop{UserID: userID, Status: "schedule", WorkFrom: stringPtr("08:00"), WorkTo: stringPtr("18:00"), Services: pq.StringArray{}, WorkingDays: boolDaysToString([]bool{true, true, true, true, true, false, false}), Payments: pq.StringArray{}}
		if err := uc.autoShopRepo.Create(ctx, profile); err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}
	if profile.WorkFrom == nil || profile.WorkTo == nil || len(profile.WorkingDays) == 0 {
		if profile.WorkFrom == nil {
			profile.WorkFrom = stringPtr("08:00")
		}
		if profile.WorkTo == nil {
			profile.WorkTo = stringPtr("18:00")
		}
		if len(profile.WorkingDays) == 0 {
			profile.WorkingDays = boolDaysToString([]bool{true, true, true, true, true, false, false})
		}
		if err := uc.autoShopRepo.Update(ctx, profile); err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}

	groupRef, subtypeRef := uc.hydrateUserActivityRefs(ctx, userID, "auto_shop")

	return map[string]interface{}{
		"id":    user.ID,
		"phone": user.Phone,
		"name":  user.Name,
		"role":  user.Role,
		"profile": domain.AutoShopResponse{
			ID:                   profile.ID,
			UserID:               profile.UserID,
			FullName:             profile.FullName,
			WorkingPhone:         profile.WorkingPhone,
			Description:          profile.Description,
			Address:              profile.Address,
			Coordinates:          profile.Coordinates,
			CoverImageURL:        profile.CoverImageURL,
			CoverImageAssetID:    profile.CoverImageAssetID,
			Status:               profile.Status,
			OnlineBookingEnabled: profile.OnlineBookingEnabled,
			Services:             []string(profile.Services),
			Payments:             []string(profile.Payments),
			Brands:               []string(profile.Brands),
			ProductCategories:    []string(profile.ProductCategories),
			WorkFrom:             profile.WorkFrom,
			WorkTo:               profile.WorkTo,
			WorkingDays:          stringDaysToBool(profile.WorkingDays),
			ActivityGroup:        groupRef,
			ActivitySubtype:      subtypeRef,
			CreatedAt:            profile.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

func (uc *MasterUseCase) UpdateAutoShopProfile(ctx context.Context, userID string, req *domain.UpdateAutoShopRequest) (map[string]interface{}, error) {
	profile, err := uc.autoShopRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}

	if req.FullName != nil {
		profile.FullName = req.FullName
	}
	if req.WorkingPhone != nil {
		profile.WorkingPhone = req.WorkingPhone
	}
	if req.Description != nil {
		profile.Description = req.Description
	}
	if req.Address != nil {
		profile.Address = req.Address
	}
	if req.Coordinates != nil {
		profile.Coordinates = req.Coordinates
	}
	if req.CoverImageURL != nil {
		profile.CoverImageURL = req.CoverImageURL
	}
	if req.CoverImageAssetID != nil {
		profile.CoverImageAssetID = req.CoverImageAssetID
	}
	if req.Status != nil {
		status, err := normalizeProviderStatusMode(*req.Status)
		if err != nil {
			return nil, err
		}
		profile.Status = status
	}
	if req.OnlineBookingEnabled != nil {
		profile.OnlineBookingEnabled = *req.OnlineBookingEnabled
	}
	if req.Services != nil {
		profile.Services = pq.StringArray(req.Services)
	}
	if req.Payments != nil {
		profile.Payments = pq.StringArray(req.Payments)
	}
	if req.Brands != nil {
		profile.Brands = pq.StringArray(req.Brands)
	}
	if req.ProductCategories != nil {
		profile.ProductCategories = pq.StringArray(req.ProductCategories)
	}
	if req.WorkFrom != nil {
		profile.WorkFrom = req.WorkFrom
	}
	if req.WorkTo != nil {
		profile.WorkTo = req.WorkTo
	}
	if req.WorkingDays != nil {
		profile.WorkingDays = boolDaysToString(req.WorkingDays)
	}

	if err := uc.autoShopRepo.Update(ctx, profile); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.GetAutoShopProfile(ctx, userID)
}

func (uc *MasterUseCase) GetAutoWashProfile(ctx context.Context, userID string) (map[string]interface{}, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	profile, err := uc.autoWashRepo.GetByUserID(ctx, userID)
	if err != nil {
		profile = &domain.AutoWash{UserID: userID, Status: "schedule", WorkFrom: stringPtr("08:00"), WorkTo: stringPtr("18:00"), Services: pq.StringArray{}, WorkingDays: boolDaysToString([]bool{true, true, true, true, true, false, false}), Payments: pq.StringArray{}}
		if err := uc.autoWashRepo.Create(ctx, profile); err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}
	if profile.OnlineBookingEnabled {
		// Normalize legacy profiles: online booking is not supported for auto washes.
		profile.OnlineBookingEnabled = false
		if err := uc.autoWashRepo.Update(ctx, profile); err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}
	if profile.WorkFrom == nil || profile.WorkTo == nil || len(profile.WorkingDays) == 0 {
		if profile.WorkFrom == nil {
			profile.WorkFrom = stringPtr("08:00")
		}
		if profile.WorkTo == nil {
			profile.WorkTo = stringPtr("18:00")
		}
		if len(profile.WorkingDays) == 0 {
			profile.WorkingDays = boolDaysToString([]bool{true, true, true, true, true, false, false})
		}
		if err := uc.autoWashRepo.Update(ctx, profile); err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}

	groupRef, subtypeRef := uc.hydrateActivityRefs(ctx, profile.ActivitySubtypeID)

	return map[string]interface{}{
		"id":    user.ID,
		"phone": user.Phone,
		"name":  user.Name,
		"role":  user.Role,
		"profile": domain.AutoWashResponse{
			ID:                   profile.ID,
			UserID:               profile.UserID,
			FullName:             profile.FullName,
			WorkingPhone:         profile.WorkingPhone,
			Description:          profile.Description,
			Address:              profile.Address,
			Coordinates:          profile.Coordinates,
			CoverImageURL:        profile.CoverImageURL,
			CoverImageAssetID:    profile.CoverImageAssetID,
			Status:               profile.Status,
			OnlineBookingEnabled: profile.OnlineBookingEnabled,
			Services:             []string(profile.Services),
			WorkFrom:             profile.WorkFrom,
			WorkTo:               profile.WorkTo,
			WorkingDays:          stringDaysToBool(profile.WorkingDays),
			BoxCount:             profile.BoxCount,
			WasherCount:          profile.WasherCount,
			HasWaitingArea:       profile.HasWaitingArea,
			Payments:             []string(profile.Payments),
			ActivityGroup:        groupRef,
			ActivitySubtype:      subtypeRef,
			CreatedAt:            profile.CreatedAt.Format(time.RFC3339),
		},
	}, nil
}

func (uc *MasterUseCase) isSelfServiceAutoWash(ctx context.Context, profile *domain.AutoWash) bool {
	if profile == nil || profile.ActivitySubtypeID == nil || uc.activitySubtypeRepo == nil {
		return false
	}
	subtype, err := uc.activitySubtypeRepo.GetByID(ctx, *profile.ActivitySubtypeID)
	return err == nil && subtype != nil && subtype.Code == "self_service"
}

func (uc *MasterUseCase) UpdateAutoWashProfile(ctx context.Context, userID string, req *domain.UpdateAutoWashRequest) (map[string]interface{}, error) {
	profile, err := uc.autoWashRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrNotFound
	}

	if req.FullName != nil {
		profile.FullName = req.FullName
	}
	if req.WorkingPhone != nil {
		profile.WorkingPhone = req.WorkingPhone
	}
	if req.Description != nil {
		profile.Description = req.Description
	}
	if req.Address != nil {
		profile.Address = req.Address
	}
	if req.Coordinates != nil {
		profile.Coordinates = req.Coordinates
	}
	if req.CoverImageURL != nil {
		profile.CoverImageURL = req.CoverImageURL
	}
	if req.CoverImageAssetID != nil {
		profile.CoverImageAssetID = req.CoverImageAssetID
	}
	if req.Status != nil {
		status, err := normalizeProviderStatusMode(*req.Status)
		if err != nil {
			return nil, err
		}
		profile.Status = status
	}
	if req.LiveQueueEnabled != nil {
		profile.LiveQueueEnabled = *req.LiveQueueEnabled
	}
	profile.OnlineBookingEnabled = false
	if profile.LiveQueueEnabled {
		profile.OnlineBookingEnabled = false
	}
	if req.Services != nil {
		profile.Services = pq.StringArray(req.Services)
	}
	if req.WorkFrom != nil {
		profile.WorkFrom = req.WorkFrom
	}
	if req.WorkTo != nil {
		profile.WorkTo = req.WorkTo
	}
	if req.WorkingDays != nil {
		profile.WorkingDays = boolDaysToString(req.WorkingDays)
	}
	// Subtype-specific fields. Применяем по правилу "поле в payload ⇒ применяем",
	// чтобы клиент мог обнулять через `null`/`0` если явно прислал. Для Payments
	// nil означает "не трогать", пустой массив — "очистить".
	if req.BoxCount != nil {
		profile.BoxCount = req.BoxCount
	}
	if req.WasherCount != nil {
		profile.WasherCount = req.WasherCount
	}
	if req.HasWaitingArea != nil {
		profile.HasWaitingArea = *req.HasWaitingArea
	}
	if req.Payments != nil {
		profile.Payments = pq.StringArray(req.Payments)
	}

	if err := uc.autoWashRepo.Update(ctx, profile); err != nil {
		return nil, apperrors.ErrInternalServer
	}

	return uc.GetAutoWashProfile(ctx, userID)
}

func mapActivityTypeToResponse(activityType *domain.ActivityType) *domain.ActivityTypeResponse {
	if activityType == nil {
		return nil
	}

	displayName := activityType.Name
	description := ""

	switch activityType.Name {
	case "master":
		// Legacy bucket master теперь соответствует новой группе private_executor →
		// «Частный исполнитель». Переименовано без смены `name`, чтобы не ломать старых клиентов.
		displayName = "Частный исполнитель"
		description = "Индивидуальные исполнители (мастера, мойщики, шиномонтажники)"
	case "auto_wash":
		displayName = "Автомойка"
		description = "Услуги мойки и детейлинга"
	case "auto_service":
		displayName = "Автосервис"
		description = "Техническое обслуживание и ремонт"
	case "auto_shop":
		displayName = "Автомагазин"
		description = "Продажа запчастей и аксессуаров"
	}

	return &domain.ActivityTypeResponse{
		ID:          activityType.ID,
		Name:        activityType.Name,
		DisplayName: displayName,
		Description: description,
		IsActive:    activityType.IsActive,
		CreatedAt:   activityType.CreatedAt.Format(time.RFC3339),
	}
}
