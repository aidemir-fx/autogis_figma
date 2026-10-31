package usecase

import (
	"context"
	"net/http"
	neturl "net/url"
	"strings"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/repository"
)

var (
	supportedBusinessApplicationSubtypes = map[string]map[string]domain.BusinessType{
		"private_executor": {
			"master": domain.BusinessTypeMaster,
			"washer": domain.BusinessTypeMaster,
		},
		"auto_service": {
			"general_service": domain.BusinessTypeAutoService,
			"tire_fitting":    domain.BusinessTypeTireFitting,
			"detailing":       domain.BusinessTypeDetailing,
		},
		"auto_wash": {
			"classic":      domain.BusinessTypeAutoWash,
			"self_service": domain.BusinessTypeAutoWash,
		},
		"auto_shop": {
			"general": domain.BusinessTypeAutoShop,
		},
	}

	legacyBusinessTypeToApplicationActivity = map[domain.BusinessType]struct {
		groupCode   string
		subtypeCode string
	}{
		domain.BusinessTypeAutoService: {groupCode: "auto_service", subtypeCode: "general_service"},
		domain.BusinessTypeAutoWash:    {groupCode: "auto_wash", subtypeCode: "classic"},
		domain.BusinessTypeAutoShop:    {groupCode: "auto_shop", subtypeCode: "general"},
		domain.BusinessTypeTireFitting: {groupCode: "auto_service", subtypeCode: "tire_fitting"},
		domain.BusinessTypeDetailing:   {groupCode: "auto_service", subtypeCode: "detailing"},
		domain.BusinessTypeStation:     {groupCode: "auto_service", subtypeCode: "general_service"},
		domain.BusinessTypeMaster:      {groupCode: "private_executor", subtypeCode: "master"},
	}
)

type BusinessApplicationUseCase struct {
	professionalUC      *ProfessionalApplicationUseCase
	masterUC            *MasterUseCase
	applicationRepo     repository.BusinessApplicationRepository
	userRepo            repository.UserRepository
	activityGroupRepo   repository.ActivityGroupRepository
	activitySubtypeRepo repository.ActivitySubtypeRepository
}

func NewBusinessApplicationUseCase(args ...interface{}) *BusinessApplicationUseCase {
	uc := &BusinessApplicationUseCase{}
	if len(args) == 1 {
		if professionalUC, ok := args[0].(*ProfessionalApplicationUseCase); ok {
			uc.professionalUC = professionalUC
			return uc
		}
	}
	if len(args) == 2 {
		professionalUC, ok1 := args[0].(*ProfessionalApplicationUseCase)
		masterUC, ok2 := args[1].(*MasterUseCase)
		if ok1 && ok2 {
			uc.professionalUC = professionalUC
			uc.masterUC = masterUC
			return uc
		}
	}
	if len(args) == 4 {
		uc.applicationRepo = args[0].(repository.BusinessApplicationRepository)
		uc.userRepo = args[1].(repository.UserRepository)
		uc.activityGroupRepo = args[2].(repository.ActivityGroupRepository)
		uc.activitySubtypeRepo = args[3].(repository.ActivitySubtypeRepository)
		return uc
	}
	panic("invalid BusinessApplicationUseCase constructor arguments")
}

func (uc *BusinessApplicationUseCase) Submit(
	ctx context.Context,
	userID string,
	req *domain.CreateBusinessApplicationRequest,
) (*domain.BusinessApplicationResponse, error) {
	if uc.professionalUC == nil {
		return uc.submitLegacyDirect(ctx, userID, req)
	}
	app, revision, err := uc.professionalUC.SubmitFromLegacy(ctx, userID, normalizeBusinessApplicationRequest(req))
	if err != nil {
		return nil, err
	}
	if err := uc.activateApplication(ctx, userID, app, revision); err != nil {
		return nil, err
	}
	app, err = uc.professionalUC.repo.GetApplicationByID(ctx, app.ID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	return toBusinessApplicationResponse(app, revision), nil
}

func (uc *BusinessApplicationUseCase) GetMyLatest(
	ctx context.Context,
	userID string,
) (*domain.BusinessApplicationResponse, error) {
	if uc.professionalUC == nil {
		app, err := uc.applicationRepo.GetLatestByUserID(ctx, userID)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		if app == nil {
			return nil, nil
		}
		return legacyBusinessApplicationEntityResponse(app), nil
	}
	app, revision, err := uc.professionalUC.GetLatestApplicationForLegacy(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if app == nil || revision == nil {
		return nil, nil
	}
	if app.Status == domain.ProfessionalApplicationStatusPending {
		if err := uc.activateApplication(ctx, userID, app, revision); err != nil {
			return nil, err
		}
		app, err = uc.professionalUC.repo.GetApplicationByID(ctx, app.ID)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
	}
	return toBusinessApplicationResponse(app, revision), nil
}

func (uc *BusinessApplicationUseCase) activateApplication(
	ctx context.Context,
	userID string,
	app *domain.ProfessionalApplication,
	revision *domain.ProfessionalApplicationRevision,
) error {
	if uc.masterUC == nil {
		return apperrors.New("PROFESSIONAL_ACTIVATION_UNAVAILABLE", "Не настроена активация профессионального профиля", http.StatusInternalServerError)
	}
	if err := uc.masterUC.ActivateFromBusinessApplication(ctx, userID, app, revision); err != nil {
		return err
	}
	return uc.professionalUC.AutoActivate(ctx, userID, app.ID)
}

func (uc *BusinessApplicationUseCase) UpdateStatus(
	ctx context.Context,
	actorUserID string,
	applicationID string,
	req *domain.UpdateBusinessApplicationStatusRequest,
) (*domain.BusinessApplicationResponse, error) {
	if uc.professionalUC == nil {
		return uc.updateLegacyDirect(ctx, applicationID, req)
	}
	app, err := uc.professionalUC.LegacyUpdateStatus(ctx, actorUserID, applicationID, req)
	if err != nil {
		return nil, err
	}
	revision, err := uc.professionalUC.resolveCurrentRevision(ctx, app)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	return toBusinessApplicationResponse(app, revision), nil
}

func (uc *BusinessApplicationUseCase) GetAll(ctx context.Context) ([]*domain.BusinessApplicationResponse, error) {
	if uc.professionalUC == nil {
		apps, err := uc.applicationRepo.GetAll(ctx)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		out := make([]*domain.BusinessApplicationResponse, 0, len(apps))
		for _, a := range apps {
			out = append(out, legacyBusinessApplicationEntityResponse(a))
		}
		return out, nil
	}
	apps, err := uc.professionalUC.ListApplicationsForLegacy(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]*domain.BusinessApplicationResponse, 0, len(apps))
	for _, a := range apps {
		revision, err := uc.professionalUC.resolveCurrentRevision(ctx, a)
		if err != nil {
			return nil, apperrors.ErrInternalServer
		}
		out = append(out, toBusinessApplicationResponse(a, revision))
	}
	return out, nil
}

func (uc *BusinessApplicationUseCase) submitLegacyDirect(
	ctx context.Context,
	userID string,
	req *domain.CreateBusinessApplicationRequest,
) (*domain.BusinessApplicationResponse, error) {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrUserNotFound
	}

	latest, err := uc.applicationRepo.GetLatestByUserID(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if latest != nil {
		switch latest.Status {
		case domain.BusinessApplicationStatusPending:
			return nil, apperrors.New("APPLICATION_ALREADY_PENDING", "У вас уже есть заявка на проверке", http.StatusConflict)
		case domain.BusinessApplicationStatusApproved:
			return nil, apperrors.New("APPLICATION_ALREADY_APPROVED", "Профессиональный аккаунт уже активирован", http.StatusConflict)
		}
	}

	normalized := normalizeBusinessApplicationRequest(req)
	if normalized.City == "" {
		return nil, validationError("Укажите город")
	}
	if normalized.Phone == "" {
		return nil, validationError("Укажите телефон")
	}
	if !normalized.AgreedToTerms {
		return nil, validationError("Необходимо согласие с условиями")
	}

	activityGroupCode, activitySubtypeCode, businessType, err := uc.resolveApplicationActivity(ctx, normalized)
	if err != nil {
		return nil, err
	}

	isPrivateExecutor := activityGroupCode == "private_executor"
	applicantName := normalized.ApplicantName
	businessName := normalized.BusinessName
	yandexMapsURL := normalized.YandexMapsURL

	if isPrivateExecutor {
		businessName = nil
		yandexMapsURL = nil
		applicantName = resolvedApplicantName(user, normalized.ApplicantName)
		if applicantName == nil {
			return nil, validationError("Укажите имя исполнителя")
		}
	} else {
		applicantName = nil
		if businessName == nil {
			return nil, validationError("Укажите название бизнеса")
		}
		if yandexMapsURL != nil {
			if err := validateYandexMapsURL(*yandexMapsURL); err != nil {
				return nil, err
			}
		}
	}

	useLegacyPayload := strings.TrimSpace(req.ActivityGroupCode) == "" &&
		strings.TrimSpace(req.ActivitySubtypeCode) == "" &&
		req.BusinessType != ""

	contactPerson := normalized.ContactPerson
	email := normalized.Email
	if !useLegacyPayload {
		contactPerson = nil
		email = nil
	}

	app := &domain.BusinessApplication{
		UserID:              userID,
		BusinessType:        businessType,
		ActivityGroupCode:   stringPtr(activityGroupCode),
		ActivitySubtypeCode: stringPtr(activitySubtypeCode),
		BusinessName:        businessName,
		ApplicantName:       applicantName,
		City:                normalized.City,
		Address:             normalized.Address,
		Phone:               normalized.Phone,
		YandexMapsURL:       yandexMapsURL,
		ContactPerson:       contactPerson,
		Email:               email,
		Comment:             normalized.Comment,
		AgreedToTerms:       normalized.AgreedToTerms,
		Status:              domain.BusinessApplicationStatusPending,
	}

	if err := uc.applicationRepo.Create(ctx, app); err != nil {
		return nil, apperrors.ErrInternalServer
	}
	return legacyBusinessApplicationEntityResponse(app), nil
}

func (uc *BusinessApplicationUseCase) updateLegacyDirect(
	ctx context.Context,
	applicationID string,
	req *domain.UpdateBusinessApplicationStatusRequest,
) (*domain.BusinessApplicationResponse, error) {
	app, err := uc.applicationRepo.GetByID(ctx, applicationID)
	if err != nil {
		return nil, apperrors.New("APPLICATION_NOT_FOUND", "Заявка не найдена", http.StatusNotFound)
	}

	app.Status = req.Status
	app.RejectionReason = req.RejectionReason
	now := time.Now()
	app.ReviewedAt = &now

	if err := uc.applicationRepo.Update(ctx, app); err != nil {
		return nil, apperrors.ErrInternalServer
	}
	if req.Status == domain.BusinessApplicationStatusApproved {
		user, err := uc.userRepo.GetByID(ctx, app.UserID)
		if err != nil {
			return nil, apperrors.ErrUserNotFound
		}
		if !user.IsProfessional {
			user.IsProfessional = true
			if err := uc.userRepo.Update(ctx, user); err != nil {
				return nil, apperrors.ErrInternalServer
			}
		}
	}
	return legacyBusinessApplicationEntityResponse(app), nil
}

func (uc *BusinessApplicationUseCase) resolveApplicationActivity(
	ctx context.Context,
	req *domain.CreateBusinessApplicationRequest,
) (string, string, domain.BusinessType, error) {
	groupCode := strings.TrimSpace(req.ActivityGroupCode)
	subtypeCode := strings.TrimSpace(req.ActivitySubtypeCode)
	businessType := req.BusinessType

	if groupCode == "" && subtypeCode == "" {
		mapped, ok := legacyBusinessTypeToApplicationActivity[businessType]
		if !ok {
			return "", "", "", validationError("Выберите главный тип и подтип деятельности")
		}
		groupCode = mapped.groupCode
		subtypeCode = mapped.subtypeCode
	}

	if groupCode == "" {
		return "", "", "", validationError("Выберите главный тип деятельности")
	}
	if subtypeCode == "" {
		return "", "", "", validationError("Выберите подтип деятельности")
	}

	group, err := uc.activityGroupRepo.GetByCode(ctx, groupCode)
	if err != nil {
		return "", "", "", validationError("Выбранный главный тип деятельности недоступен")
	}
	if !group.IsActive {
		return "", "", "", validationError("Выбранный главный тип деятельности недоступен")
	}

	subtype, err := uc.activitySubtypeRepo.GetByGroupAndCode(ctx, group.ID, subtypeCode)
	if err != nil {
		return "", "", "", validationError("Выбранный подтип не относится к указанному типу деятельности")
	}
	if !subtype.IsActive {
		return "", "", "", validationError("Выбранный подтип деятельности недоступен")
	}

	allowedSubtypes, ok := supportedBusinessApplicationSubtypes[group.Code]
	if !ok {
		return "", "", "", validationError("Выбранный тип деятельности пока не поддерживается формой заявки")
	}
	derivedBusinessType, ok := allowedSubtypes[subtype.Code]
	if !ok {
		return "", "", "", validationError("Выбранный подтип деятельности пока не поддерживается формой заявки")
	}

	if businessType == "" {
		businessType = derivedBusinessType
	}
	return group.Code, subtype.Code, businessType, nil
}

func normalizeBusinessApplicationRequest(
	req *domain.CreateBusinessApplicationRequest,
) *domain.CreateBusinessApplicationRequest {
	if req == nil {
		return &domain.CreateBusinessApplicationRequest{}
	}

	return &domain.CreateBusinessApplicationRequest{
		BusinessType:        req.BusinessType,
		ActivityGroupCode:   strings.TrimSpace(req.ActivityGroupCode),
		ActivitySubtypeCode: strings.TrimSpace(req.ActivitySubtypeCode),
		BusinessName:        normalizeOptionalString(req.BusinessName),
		ApplicantName:       normalizeOptionalString(req.ApplicantName),
		City:                strings.TrimSpace(req.City),
		Address:             normalizeOptionalString(req.Address),
		Phone:               strings.TrimSpace(req.Phone),
		YandexMapsURL:       normalizeOptionalString(req.YandexMapsURL),
		Comment:             normalizeOptionalString(req.Comment),
		AgreedToTerms:       req.AgreedToTerms,
		ContactPerson:       normalizeOptionalString(req.ContactPerson),
		Email:               normalizeOptionalString(req.Email),
	}
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func resolvedApplicantName(user *domain.User, explicit *string) *string {
	if explicit != nil {
		return explicit
	}
	if user == nil || user.Name == nil {
		return nil
	}
	return normalizeOptionalString(user.Name)
}

func validateYandexMapsURL(raw string) error {
	parsed, err := neturl.ParseRequestURI(strings.TrimSpace(raw))
	if err != nil {
		return validationError("Ссылка на Яндекс.Карты должна быть корректным URL")
	}

	host := strings.ToLower(strings.TrimPrefix(parsed.Hostname(), "www."))
	allowedDomains := []string{
		"yandex.ru",
		"yandex.com",
		"yandex.by",
		"yandex.kz",
		"yandex.uz",
		"ya.ru",
	}

	for _, domainName := range allowedDomains {
		if host == domainName || strings.HasSuffix(host, "."+domainName) {
			return nil
		}
	}

	return validationError("Добавьте ссылку на Яндекс.Карты или карточку организации Яндекса")
}

func validationError(message string) error {
	return apperrors.New("VALIDATION_FAILED", message, http.StatusBadRequest)
}

func stringPtr(value string) *string {
	return &value
}

func toBusinessApplicationResponse(
	app *domain.ProfessionalApplication,
	revision *domain.ProfessionalApplicationRevision,
) *domain.BusinessApplicationResponse {
	if app == nil {
		return nil
	}

	payload := domain.JSONMap{}
	if revision != nil {
		payload = decodeStoredJSONMap(revision.PayloadJSON)
	}

	businessType := businessTypeFromRevision(app, payload)
	phone := app.ContactPhone
	if phone == "" {
		phone = stringValue(payload, "phone")
	}
	city := ""
	if app.City != nil {
		city = *app.City
	} else {
		city = stringValue(payload, "city")
	}

	reviewedAt := formatTimePtr(app.ResolvedAt)
	if reviewedAt == nil && app.Status == domain.ProfessionalApplicationStatusNeedsRevision {
		formatted := app.UpdatedAt.Format(time.RFC3339)
		reviewedAt = &formatted
	}

	status := domain.BusinessApplicationStatus(app.Status)
	return &domain.BusinessApplicationResponse{
		ID:                  app.ID,
		UserID:              app.UserID,
		BusinessType:        businessType,
		ActivityGroupCode:   app.ActivityGroupCode,
		ActivitySubtypeCode: app.ActivitySubtypeCode,
		BusinessName:        stringValuePtr(payload, "businessName"),
		ApplicantName:       stringValuePtr(payload, "applicantName"),
		City:                city,
		Address:             stringValuePtr(payload, "address"),
		Phone:               phone,
		YandexMapsURL:       stringValuePtr(payload, "yandexMapsUrl"),
		ContactPerson:       stringValuePtr(payload, "contactPerson"),
		Email:               firstNonNil(app.ContactEmail, stringValuePtr(payload, "email")),
		Comment:             stringValuePtr(payload, "comment"),
		Status:              status,
		RejectionReason:     app.DecisionComment,
		ReviewedAt:          reviewedAt,
		CreatedAt:           app.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           app.UpdatedAt.Format(time.RFC3339Nano),
	}
}

func legacyBusinessApplicationEntityResponse(a *domain.BusinessApplication) *domain.BusinessApplicationResponse {
	if a == nil {
		return nil
	}
	var reviewedAt *string
	if a.ReviewedAt != nil {
		formatted := a.ReviewedAt.Format(time.RFC3339)
		reviewedAt = &formatted
	}
	return &domain.BusinessApplicationResponse{
		ID:                  a.ID,
		UserID:              a.UserID,
		BusinessType:        a.BusinessType,
		ActivityGroupCode:   a.ActivityGroupCode,
		ActivitySubtypeCode: a.ActivitySubtypeCode,
		BusinessName:        a.BusinessName,
		ApplicantName:       a.ApplicantName,
		City:                a.City,
		Address:             a.Address,
		Phone:               a.Phone,
		YandexMapsURL:       a.YandexMapsURL,
		ContactPerson:       a.ContactPerson,
		Email:               a.Email,
		Comment:             a.Comment,
		Status:              a.Status,
		RejectionReason:     a.RejectionReason,
		ReviewedAt:          reviewedAt,
		CreatedAt:           a.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           a.UpdatedAt.Format(time.RFC3339Nano),
	}
}

func businessTypeFromRevision(
	app *domain.ProfessionalApplication,
	payload domain.JSONMap,
) domain.BusinessType {
	if raw := strings.TrimSpace(stringValue(payload, "businessType")); raw != "" {
		return domain.BusinessType(raw)
	}
	if app == nil || app.ActivityGroupCode == nil {
		return ""
	}
	groupCode := *app.ActivityGroupCode
	subtypeCode := ""
	if app.ActivitySubtypeCode != nil {
		subtypeCode = *app.ActivitySubtypeCode
	}
	switch groupCode {
	case "auto_service":
		switch subtypeCode {
		case "tire_fitting":
			return domain.BusinessTypeTireFitting
		case "detailing":
			return domain.BusinessTypeDetailing
		default:
			return domain.BusinessTypeAutoService
		}
	case "auto_wash":
		return domain.BusinessTypeAutoWash
	case "auto_shop":
		return domain.BusinessTypeAutoShop
	case "private_executor":
		return domain.BusinessTypeMaster
	default:
		return ""
	}
}

func stringValue(payload domain.JSONMap, key string) string {
	if value, ok := payload[key].(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func firstNonNil(values ...*string) *string {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}
