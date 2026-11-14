package usecase

import (
	"context"

	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/repository"
)

type MasterFavoriteUseCase struct {
	favorites repository.MasterFavoriteRepository
	masters   repository.MasterRepository
}

func NewMasterFavoriteUseCase(
	favorites repository.MasterFavoriteRepository,
	masters repository.MasterRepository,
) *MasterFavoriteUseCase {
	return &MasterFavoriteUseCase{favorites: favorites, masters: masters}
}

func (uc *MasterFavoriteUseCase) Get(ctx context.Context, userID, masterID string) (bool, error) {
	if _, err := uc.masters.GetByID(ctx, masterID); err != nil {
		return false, apperrors.ErrNotFound
	}
	return uc.favorites.IsFavorite(ctx, userID, masterID)
}

func (uc *MasterFavoriteUseCase) Add(ctx context.Context, userID, masterID string) error {
	if _, err := uc.masters.GetByID(ctx, masterID); err != nil {
		return apperrors.ErrNotFound
	}
	return uc.favorites.Add(ctx, userID, masterID)
}

func (uc *MasterFavoriteUseCase) Remove(ctx context.Context, userID, masterID string) error {
	if _, err := uc.masters.GetByID(ctx, masterID); err != nil {
		return apperrors.ErrNotFound
	}
	return uc.favorites.Remove(ctx, userID, masterID)
}

type AutoServiceFavoriteUseCase struct {
	favorites   repository.AutoServiceFavoriteRepository
	autoService repository.AutoServiceRepository
}

func NewAutoServiceFavoriteUseCase(favorites repository.AutoServiceFavoriteRepository, autoService repository.AutoServiceRepository) *AutoServiceFavoriteUseCase {
	return &AutoServiceFavoriteUseCase{favorites: favorites, autoService: autoService}
}

func (uc *AutoServiceFavoriteUseCase) Get(ctx context.Context, userID, autoServiceID string) (bool, error) {
	if _, err := uc.autoService.GetByID(ctx, autoServiceID); err != nil {
		return false, apperrors.ErrNotFound
	}
	return uc.favorites.IsFavorite(ctx, userID, autoServiceID)
}

func (uc *AutoServiceFavoriteUseCase) Add(ctx context.Context, userID, autoServiceID string) error {
	if _, err := uc.autoService.GetByID(ctx, autoServiceID); err != nil {
		return apperrors.ErrNotFound
	}
	return uc.favorites.Add(ctx, userID, autoServiceID)
}

func (uc *AutoServiceFavoriteUseCase) Remove(ctx context.Context, userID, autoServiceID string) error {
	if _, err := uc.autoService.GetByID(ctx, autoServiceID); err != nil {
		return apperrors.ErrNotFound
	}
	return uc.favorites.Remove(ctx, userID, autoServiceID)
}
