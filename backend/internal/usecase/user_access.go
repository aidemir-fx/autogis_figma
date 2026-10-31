package usecase

import (
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
)

func deriveUserAccountType(role domain.UserRole) domain.UserAccountType {
	switch role {
	case domain.RoleMaster:
		return domain.UserAccountTypePrivateExecutor
	case domain.RoleAutoWash:
		return domain.UserAccountTypeAutoWash
	case domain.RoleAutoShop:
		return domain.UserAccountTypeAutoShop
	case domain.RoleAutoService:
		return domain.UserAccountTypeAutoService
	case domain.RoleAdmin:
		return domain.UserAccountTypeAdmin
	case domain.RoleModerator:
		return domain.UserAccountTypeModerator
	default:
		return domain.UserAccountTypeCustomer
	}
}

func hasBusinessCrmAccess(_ *domain.User, accountType domain.UserAccountType) bool {
	// Первый этап CRM предназначен только для автосервисов.
	// Автомойки и автомагазины подключим отдельными сценариями позже.
	return accountType == domain.UserAccountTypeAutoService
}

func deriveUserCapabilities(user *domain.User, accountType domain.UserAccountType) domain.UserCapabilities {
	professionalCabinet := user != nil && user.IsProfessional
	crmMini := professionalCabinet && accountType == domain.UserAccountTypePrivateExecutor
	businessCrm := professionalCabinet && hasBusinessCrmAccess(user, accountType)
	providerWorkflowAccess := professionalCabinet

	return domain.UserCapabilities{
		ProfessionalCabinet: professionalCabinet,
		CrmMini:             crmMini,
		BusinessCrm:         businessCrm,
		ProfessionalChat:    providerWorkflowAccess,
		Applications:        providerWorkflowAccess,
		Calendar:            providerWorkflowAccess,
	}
}

func buildUserResponse(user *domain.User) *domain.UserResponse {
	if user == nil {
		return nil
	}

	privacyAgreedAt := ""
	if user.PrivacyAgreedAt != nil {
		privacyAgreedAt = user.PrivacyAgreedAt.Format(time.RFC3339)
	}

	accountType := deriveUserAccountType(user.Role)

	return &domain.UserResponse{
		ID:              user.ID,
		Phone:           user.Phone,
		Name:            user.Name,
		ContactNumber:   user.ContactNumber,
		Role:            user.Role,
		AccountType:     accountType,
		IsProfessional:  user.IsProfessional,
		Capabilities:    deriveUserCapabilities(user, accountType),
		AgreedToPrivacy: user.AgreedToPrivacy,
		PrivacyAgreedAt: func() *string {
			if privacyAgreedAt == "" {
				return nil
			}
			return &privacyAgreedAt
		}(),
		Coordinates: user.Coordinates,
		CreatedAt:   user.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   user.UpdatedAt.Format(time.RFC3339),
	}
}
