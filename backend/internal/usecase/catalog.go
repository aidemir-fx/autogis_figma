package usecase

import (
	"context"

	"github.com/gmt061/autogis-backend/internal/domain"
	"github.com/gmt061/autogis-backend/internal/repository"
)

type CatalogUseCase struct {
	repo repository.CatalogRepository
}

func NewCatalogUseCase(repo repository.CatalogRepository) *CatalogUseCase {
	return &CatalogUseCase{repo: repo}
}

func (uc *CatalogUseCase) ListProfessions(ctx context.Context) ([]*domain.CatalogProfession, error) {
	return uc.repo.ListProfessions(ctx)
}

func (uc *CatalogUseCase) ListServices(ctx context.Context) ([]*domain.CatalogService, error) {
	return uc.repo.ListServices(ctx)
}

func (uc *CatalogUseCase) ListProductCategories(ctx context.Context) ([]*domain.ProductCategory, error) {
	return uc.repo.ListProductCategories(ctx)
}

func (uc *CatalogUseCase) ListVehicleBrands(ctx context.Context) ([]*domain.VehicleBrand, error) {
	return uc.repo.ListVehicleBrands(ctx)
}
