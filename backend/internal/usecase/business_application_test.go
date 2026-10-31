package usecase

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/gmt061/autogis-backend/internal/domain"
)

func TestBusinessApplicationSubmitPrivateExecutorUsesProfileName(t *testing.T) {
	t.Parallel()

	userName := " Иван Петров "
	userRepo := &businessApplicationUserRepoStub{
		user: &domain.User{ID: "user-1", Name: &userName},
	}
	appRepo := &businessApplicationRepoStub{}
	groupRepo, subtypeRepo := newBusinessApplicationActivityRepos()
	uc := NewBusinessApplicationUseCase(appRepo, userRepo, groupRepo, subtypeRepo)

	businessName := "Нужно скрыть"
	yandexMapsURL := "https://yandex.ru/maps/org/test/123"
	resp, err := uc.Submit(context.Background(), "user-1", &domain.CreateBusinessApplicationRequest{
		ActivityGroupCode:   "private_executor",
		ActivitySubtypeCode: "master",
		BusinessName:        &businessName,
		YandexMapsURL:       &yandexMapsURL,
		City:                " Москва ",
		Phone:               "+79991234567",
		AgreedToTerms:       true,
	})
	if err != nil {
		t.Fatalf("Submit returned error: %v", err)
	}
	if appRepo.created == nil {
		t.Fatal("expected application to be created")
	}
	if appRepo.created.ApplicantName == nil || *appRepo.created.ApplicantName != "Иван Петров" {
		t.Fatalf("expected applicant name from profile, got %#v", appRepo.created.ApplicantName)
	}
	if appRepo.created.BusinessName != nil {
		t.Fatalf("expected business name to be omitted, got %#v", appRepo.created.BusinessName)
	}
	if appRepo.created.YandexMapsURL != nil {
		t.Fatalf("expected yandex maps url to be omitted, got %#v", appRepo.created.YandexMapsURL)
	}
	if resp.ApplicantName == nil || *resp.ApplicantName != "Иван Петров" {
		t.Fatalf("expected response applicant name, got %#v", resp.ApplicantName)
	}
}

func TestBusinessApplicationSubmitPrivateExecutorRequiresName(t *testing.T) {
	t.Parallel()

	userRepo := &businessApplicationUserRepoStub{
		user: &domain.User{ID: "user-1"},
	}
	appRepo := &businessApplicationRepoStub{}
	groupRepo, subtypeRepo := newBusinessApplicationActivityRepos()
	uc := NewBusinessApplicationUseCase(appRepo, userRepo, groupRepo, subtypeRepo)

	_, err := uc.Submit(context.Background(), "user-1", &domain.CreateBusinessApplicationRequest{
		ActivityGroupCode:   "private_executor",
		ActivitySubtypeCode: "washer",
		City:                "Москва",
		Phone:               "+79991234567",
		AgreedToTerms:       true,
	})
	if err == nil {
		t.Fatal("expected validation error")
	}
	if !strings.Contains(err.Error(), "имя исполнителя") {
		t.Fatalf("expected applicant name validation error, got %v", err)
	}
	if appRepo.created != nil {
		t.Fatal("application should not be created on validation error")
	}
}

func TestBusinessApplicationSubmitBusinessAllowsMissingYandexMapsURL(t *testing.T) {
	t.Parallel()

	userRepo := &businessApplicationUserRepoStub{
		user: &domain.User{ID: "user-1"},
	}
	appRepo := &businessApplicationRepoStub{}
	groupRepo, subtypeRepo := newBusinessApplicationActivityRepos()
	uc := NewBusinessApplicationUseCase(appRepo, userRepo, groupRepo, subtypeRepo)

	businessName := "Шина 24"
	_, err := uc.Submit(context.Background(), "user-1", &domain.CreateBusinessApplicationRequest{
		ActivityGroupCode:   "auto_service",
		ActivitySubtypeCode: "general_service",
		BusinessName:        &businessName,
		City:                "Москва",
		Phone:               "+79991234567",
		AgreedToTerms:       true,
	})
	if err != nil {
		t.Fatalf("Submit returned error: %v", err)
	}
	if appRepo.created == nil {
		t.Fatal("expected application to be created")
	}
	if appRepo.created.YandexMapsURL != nil {
		t.Fatalf("expected yandex maps url to be omitted, got %#v", appRepo.created.YandexMapsURL)
	}
}

func TestBusinessApplicationSubmitLegacyBusinessTypeFallback(t *testing.T) {
	t.Parallel()

	userRepo := &businessApplicationUserRepoStub{
		user: &domain.User{ID: "user-1"},
	}
	appRepo := &businessApplicationRepoStub{}
	groupRepo, subtypeRepo := newBusinessApplicationActivityRepos()
	uc := NewBusinessApplicationUseCase(appRepo, userRepo, groupRepo, subtypeRepo)

	businessName := "Шина 24"
	contactPerson := "Иван"
	email := "ivan@example.com"
	resp, err := uc.Submit(context.Background(), "user-1", &domain.CreateBusinessApplicationRequest{
		BusinessType:  domain.BusinessTypeTireFitting,
		BusinessName:  &businessName,
		City:          "Москва",
		Phone:         "+79991234567",
		ContactPerson: &contactPerson,
		Email:         &email,
		AgreedToTerms: true,
		YandexMapsURL: stringPtrForTest("https://yandex.ru/maps/org/test/123"),
	})
	if err != nil {
		t.Fatalf("Submit returned error: %v", err)
	}
	if appRepo.created == nil {
		t.Fatal("expected application to be created")
	}
	if appRepo.created.ActivityGroupCode == nil || *appRepo.created.ActivityGroupCode != "auto_service" {
		t.Fatalf("expected fallback activity group, got %#v", appRepo.created.ActivityGroupCode)
	}
	if appRepo.created.ActivitySubtypeCode == nil || *appRepo.created.ActivitySubtypeCode != "tire_fitting" {
		t.Fatalf("expected fallback activity subtype, got %#v", appRepo.created.ActivitySubtypeCode)
	}
	if appRepo.created.BusinessType != domain.BusinessTypeTireFitting {
		t.Fatalf("expected legacy business type to be preserved, got %s", appRepo.created.BusinessType)
	}
	if appRepo.created.ContactPerson == nil || *appRepo.created.ContactPerson != contactPerson {
		t.Fatalf("expected contact person to be preserved for legacy payload, got %#v", appRepo.created.ContactPerson)
	}
	if resp.ActivitySubtypeCode == nil || *resp.ActivitySubtypeCode != "tire_fitting" {
		t.Fatalf("expected response subtype, got %#v", resp.ActivitySubtypeCode)
	}
}

type businessApplicationRepoStub struct {
	latest  *domain.BusinessApplication
	created *domain.BusinessApplication
}

func (s *businessApplicationRepoStub) Create(_ context.Context, app *domain.BusinessApplication) error {
	s.created = app
	return nil
}

func (s *businessApplicationRepoStub) GetByID(_ context.Context, _ string) (*domain.BusinessApplication, error) {
	if s.created == nil {
		return nil, errors.New("not found")
	}
	return s.created, nil
}

func (s *businessApplicationRepoStub) GetLatestByUserID(_ context.Context, _ string) (*domain.BusinessApplication, error) {
	return s.latest, nil
}

func (s *businessApplicationRepoStub) GetAll(_ context.Context) ([]*domain.BusinessApplication, error) {
	if s.created == nil {
		return nil, nil
	}
	return []*domain.BusinessApplication{s.created}, nil
}

func (s *businessApplicationRepoStub) Update(_ context.Context, app *domain.BusinessApplication) error {
	s.created = app
	return nil
}

type businessApplicationUserRepoStub struct {
	user *domain.User
}

func (s *businessApplicationUserRepoStub) Create(_ context.Context, _ *domain.User) error {
	return nil
}

func (s *businessApplicationUserRepoStub) GetByID(_ context.Context, _ string) (*domain.User, error) {
	if s.user == nil {
		return nil, errors.New("not found")
	}
	return s.user, nil
}

func (s *businessApplicationUserRepoStub) GetByPhone(_ context.Context, _ string) (*domain.User, error) {
	return nil, errors.New("not implemented")
}

func (s *businessApplicationUserRepoStub) GetAll(_ context.Context) ([]*domain.User, error) {
	return nil, nil
}

func (s *businessApplicationUserRepoStub) GetByRole(_ context.Context, _ domain.UserRole) ([]*domain.User, error) {
	return nil, nil
}

func (s *businessApplicationUserRepoStub) Update(_ context.Context, user *domain.User) error {
	s.user = user
	return nil
}

func (s *businessApplicationUserRepoStub) Delete(_ context.Context, _ string) error {
	return nil
}

type businessApplicationGroupRepoStub struct {
	groups map[string]*domain.ActivityGroup
}

func newBusinessApplicationActivityRepos() (*businessApplicationGroupRepoStub, *businessApplicationSubtypeRepoStub) {
	autoServiceGroup := &domain.ActivityGroup{ID: "group-auto-service", Code: "auto_service", IsActive: true}
	autoWashGroup := &domain.ActivityGroup{ID: "group-auto-wash", Code: "auto_wash", IsActive: true}
	privateExecutorGroup := &domain.ActivityGroup{ID: "group-private", Code: "private_executor", IsActive: true}

	return &businessApplicationGroupRepoStub{
			groups: map[string]*domain.ActivityGroup{
				autoServiceGroup.Code:     autoServiceGroup,
				autoWashGroup.Code:        autoWashGroup,
				privateExecutorGroup.Code: privateExecutorGroup,
			},
		}, &businessApplicationSubtypeRepoStub{
			subtypes: map[string]*domain.ActivitySubtype{
				autoServiceGroup.ID + ":general_service": {
					ID: "subtype-general-service", GroupID: autoServiceGroup.ID, Code: "general_service", IsActive: true,
				},
				autoServiceGroup.ID + ":tire_fitting": {
					ID: "subtype-tire-fitting", GroupID: autoServiceGroup.ID, Code: "tire_fitting", IsActive: true,
				},
				autoServiceGroup.ID + ":detailing": {
					ID: "subtype-detailing", GroupID: autoServiceGroup.ID, Code: "detailing", IsActive: true,
				},
				autoWashGroup.ID + ":classic": {
					ID: "subtype-classic", GroupID: autoWashGroup.ID, Code: "classic", IsActive: true,
				},
				autoWashGroup.ID + ":self_service": {
					ID: "subtype-self-service", GroupID: autoWashGroup.ID, Code: "self_service", IsActive: true,
				},
				privateExecutorGroup.ID + ":master": {
					ID: "subtype-master", GroupID: privateExecutorGroup.ID, Code: "master", IsActive: true,
				},
				privateExecutorGroup.ID + ":washer": {
					ID: "subtype-washer", GroupID: privateExecutorGroup.ID, Code: "washer", IsActive: true,
				},
			},
		}
}

func (s *businessApplicationGroupRepoStub) GetByID(_ context.Context, id string) (*domain.ActivityGroup, error) {
	for _, group := range s.groups {
		if group.ID == id {
			return group, nil
		}
	}
	return nil, errors.New("not found")
}

func (s *businessApplicationGroupRepoStub) GetByCode(_ context.Context, code string) (*domain.ActivityGroup, error) {
	group, ok := s.groups[code]
	if !ok {
		return nil, errors.New("not found")
	}
	return group, nil
}

func (s *businessApplicationGroupRepoStub) GetAll(_ context.Context) ([]*domain.ActivityGroup, error) {
	out := make([]*domain.ActivityGroup, 0, len(s.groups))
	for _, group := range s.groups {
		out = append(out, group)
	}
	return out, nil
}

func (s *businessApplicationGroupRepoStub) GetActive(_ context.Context) ([]*domain.ActivityGroup, error) {
	return s.GetAll(context.Background())
}

func (s *businessApplicationGroupRepoStub) Upsert(_ context.Context, group *domain.ActivityGroup) error {
	s.groups[group.Code] = group
	return nil
}

type businessApplicationSubtypeRepoStub struct {
	subtypes map[string]*domain.ActivitySubtype
}

func (s *businessApplicationSubtypeRepoStub) GetByID(_ context.Context, id string) (*domain.ActivitySubtype, error) {
	for _, subtype := range s.subtypes {
		if subtype.ID == id {
			return subtype, nil
		}
	}
	return nil, errors.New("not found")
}

func (s *businessApplicationSubtypeRepoStub) GetByGroupAndCode(_ context.Context, groupID, code string) (*domain.ActivitySubtype, error) {
	subtype, ok := s.subtypes[groupID+":"+code]
	if !ok {
		return nil, errors.New("not found")
	}
	return subtype, nil
}

func (s *businessApplicationSubtypeRepoStub) GetByGroupID(_ context.Context, groupID string) ([]*domain.ActivitySubtype, error) {
	var out []*domain.ActivitySubtype
	for key, subtype := range s.subtypes {
		if strings.HasPrefix(key, groupID+":") {
			out = append(out, subtype)
		}
	}
	return out, nil
}

func (s *businessApplicationSubtypeRepoStub) GetActiveByGroupID(ctx context.Context, groupID string) ([]*domain.ActivitySubtype, error) {
	return s.GetByGroupID(ctx, groupID)
}

func (s *businessApplicationSubtypeRepoStub) GetAll(_ context.Context) ([]*domain.ActivitySubtype, error) {
	out := make([]*domain.ActivitySubtype, 0, len(s.subtypes))
	for _, subtype := range s.subtypes {
		out = append(out, subtype)
	}
	return out, nil
}

func (s *businessApplicationSubtypeRepoStub) Upsert(_ context.Context, subtype *domain.ActivitySubtype) error {
	s.subtypes[subtype.GroupID+":"+subtype.Code] = subtype
	return nil
}

func (s *businessApplicationSubtypeRepoStub) MaxUpdatedAt(_ context.Context) (int64, error) {
	return 0, nil
}

func stringPtrForTest(value string) *string {
	return &value
}
