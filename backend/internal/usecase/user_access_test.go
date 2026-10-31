package usecase

import (
	"testing"

	"github.com/gmt061/autogis-backend/internal/domain"
)

func TestBuildUserResponseForPrivateExecutorProfessional(t *testing.T) {
	user := &domain.User{
		ID:             "user-1",
		Phone:          "+7 (999) 000-00-01",
		Role:           domain.RoleMaster,
		IsProfessional: true,
	}

	resp := buildUserResponse(user)
	if resp == nil {
		t.Fatal("expected user response")
	}
	if resp.AccountType != domain.UserAccountTypePrivateExecutor {
		t.Fatalf("expected private_executor account type, got %q", resp.AccountType)
	}
	if !resp.Capabilities.ProfessionalCabinet {
		t.Fatal("expected professional cabinet access")
	}
	if !resp.Capabilities.CrmMini {
		t.Fatal("expected crmMini access for private executor")
	}
	if !resp.Capabilities.ProfessionalChat || !resp.Capabilities.Applications || !resp.Capabilities.Calendar {
		t.Fatal("expected crmMini capabilities to unlock chat, applications, and calendar")
	}
	if resp.Capabilities.BusinessCrm {
		t.Fatal("did not expect business CRM access for private executor")
	}
}

func TestBuildUserResponseForBusinessProfessional(t *testing.T) {
	user := &domain.User{
		ID:             "user-2",
		Phone:          "+7 (999) 000-00-02",
		Role:           domain.RoleAutoService,
		IsProfessional: true,
	}

	resp := buildUserResponse(user)
	if resp == nil {
		t.Fatal("expected user response")
	}
	if resp.AccountType != domain.UserAccountTypeAutoService {
		t.Fatalf("expected auto_service account type, got %q", resp.AccountType)
	}
	if !resp.Capabilities.ProfessionalCabinet {
		t.Fatal("expected professional cabinet access for approved business")
	}
	if resp.Capabilities.CrmMini {
		t.Fatal("did not expect crmMini access for business account")
	}
    if !resp.Capabilities.BusinessCrm {
        t.Fatal("expected business CRM access for auto service")
	}
	if !resp.Capabilities.ProfessionalChat || !resp.Capabilities.Applications || !resp.Capabilities.Calendar {
		t.Fatal("expected approved business to access provider chat, applications, and calendar")
	}
}

func TestBuildUserResponseForCustomer(t *testing.T) {
	user := &domain.User{
		ID:             "user-3",
		Phone:          "+7 (999) 000-00-03",
		Role:           domain.RoleCustomer,
		IsProfessional: false,
	}

	resp := buildUserResponse(user)
	if resp == nil {
		t.Fatal("expected user response")
	}
	if resp.AccountType != domain.UserAccountTypeCustomer {
		t.Fatalf("expected customer account type, got %q", resp.AccountType)
	}
	if resp.Capabilities.ProfessionalCabinet || resp.Capabilities.CrmMini || resp.Capabilities.BusinessCrm {
		t.Fatal("did not expect professional capabilities for customer")
	}
}
