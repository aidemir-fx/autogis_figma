package usecase

import (
	"testing"

	"github.com/gmt061/autogis-backend/internal/domain"
)

func TestCanAccessOrder(t *testing.T) {
	order := &domain.Order{
		CustomerID: "customer-1",
		ProviderID: stringPointer("provider-1"),
	}

	tests := []struct {
		name      string
		actorID   string
		actorRole domain.UserRole
		want      bool
	}{
		{
			name:      "customer can access own order",
			actorID:   "customer-1",
			actorRole: domain.RoleCustomer,
			want:      true,
		},
		{
			name:      "provider can access own order",
			actorID:   "provider-1",
			actorRole: domain.RoleAutoService,
			want:      true,
		},
		{
			name:      "admin can access any order",
			actorID:   "admin-1",
			actorRole: domain.RoleAdmin,
			want:      true,
		},
		{
			name:      "third party cannot access order",
			actorID:   "intruder-1",
			actorRole: domain.RoleCustomer,
			want:      false,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			got := canAccessOrder(order, tt.actorID, tt.actorRole)
			if got != tt.want {
				t.Fatalf("canAccessOrder() = %v, want %v", got, tt.want)
			}
		})
	}
}

func stringPointer(value string) *string {
	return &value
}
