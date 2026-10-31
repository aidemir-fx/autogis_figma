// Package usecase: ActivityUseCase — бизнес-логика чтения справочников классификации
// деятельности (activity_groups, activity_subtypes). Справочники редко меняются и часто
// запрашиваются (каждая регистрация), поэтому отдаются с process-local кэшем и ETag
// (см. spec §10.2).
package usecase

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"
	"github.com/gmt061/autogis-backend/internal/repository"
)

const (
	// activityCacheTTL — TTL process-local кэша справочников. Спеку выбирали так, чтобы
	// обновление справочников (admin-CRUD) становилось видимо клиентам в течение минуты.
	activityCacheTTL = 60 * time.Second
)

type ActivityUseCase struct {
	groupRepo   repository.ActivityGroupRepository
	subtypeRepo repository.ActivitySubtypeRepository

	mu          sync.RWMutex
	groupsCache []*domain.ActivityGroup
	// subtypesByGroupID хранит активные подтипы, сгруппированные по id группы.
	subtypesByGroupID map[string][]*domain.ActivitySubtype
	cachedETag        string
	cacheExpiresAt    time.Time
}

func NewActivityUseCase(
	groupRepo repository.ActivityGroupRepository,
	subtypeRepo repository.ActivitySubtypeRepository,
) *ActivityUseCase {
	return &ActivityUseCase{
		groupRepo:         groupRepo,
		subtypeRepo:       subtypeRepo,
		subtypesByGroupID: map[string][]*domain.ActivitySubtype{},
	}
}

// GetGroups возвращает активные группы и ETag для HTTP-кэширования.
func (uc *ActivityUseCase) GetGroups(ctx context.Context) ([]domain.ActivityGroupResponse, string, error) {
	if err := uc.refreshIfExpired(ctx); err != nil {
		return nil, "", err
	}
	uc.mu.RLock()
	defer uc.mu.RUnlock()

	out := make([]domain.ActivityGroupResponse, 0, len(uc.groupsCache))
	for _, g := range uc.groupsCache {
		out = append(out, groupToResponse(g))
	}
	return out, uc.cachedETag, nil
}

// GetSubtypesByGroupCode возвращает активные подтипы группы по её коду + ETag.
// Если группа не найдена — ACTIVITY_GROUP_NOT_FOUND (404).
func (uc *ActivityUseCase) GetSubtypesByGroupCode(ctx context.Context, groupCode string) ([]domain.ActivitySubtypeResponse, string, error) {
	if err := uc.refreshIfExpired(ctx); err != nil {
		return nil, "", err
	}
	uc.mu.RLock()
	defer uc.mu.RUnlock()

	var group *domain.ActivityGroup
	for _, g := range uc.groupsCache {
		if g.Code == groupCode {
			group = g
			break
		}
	}
	if group == nil {
		return nil, "", apperrors.New("ACTIVITY_GROUP_NOT_FOUND", "Activity group not found", 404)
	}

	subs := uc.subtypesByGroupID[group.ID]
	out := make([]domain.ActivitySubtypeResponse, 0, len(subs))
	for _, s := range subs {
		out = append(out, subtypeToResponse(s, group.Code))
	}
	return out, uc.cachedETag, nil
}

// CurrentETag отдаёт текущий ETag (без гидратации списков) — удобно для Conditional GET.
func (uc *ActivityUseCase) CurrentETag(ctx context.Context) (string, error) {
	if err := uc.refreshIfExpired(ctx); err != nil {
		return "", err
	}
	uc.mu.RLock()
	defer uc.mu.RUnlock()
	return uc.cachedETag, nil
}

// refreshIfExpired — ленивое обновление кэша. Пересчитывает ETag по MAX(updated_at)
// справочников. Защищено double-checked locking, чтобы конкурентные запросы не грузили
// БД одновременно.
func (uc *ActivityUseCase) refreshIfExpired(ctx context.Context) error {
	uc.mu.RLock()
	fresh := time.Now().Before(uc.cacheExpiresAt) && uc.cachedETag != ""
	uc.mu.RUnlock()
	if fresh {
		return nil
	}

	uc.mu.Lock()
	defer uc.mu.Unlock()
	// Double-check: другой goroutine мог уже обновить кэш, пока мы ждали Lock.
	if time.Now().Before(uc.cacheExpiresAt) && uc.cachedETag != "" {
		return nil
	}

	groups, err := uc.groupRepo.GetActive(ctx)
	if err != nil {
		return apperrors.ErrInternalServer
	}
	subtypes, err := uc.subtypeRepo.GetAll(ctx)
	if err != nil {
		return apperrors.ErrInternalServer
	}
	maxUpdated, err := uc.subtypeRepo.MaxUpdatedAt(ctx)
	if err != nil {
		return apperrors.ErrInternalServer
	}

	uc.groupsCache = groups
	uc.subtypesByGroupID = map[string][]*domain.ActivitySubtype{}
	for _, s := range subtypes {
		if !s.IsActive {
			continue
		}
		uc.subtypesByGroupID[s.GroupID] = append(uc.subtypesByGroupID[s.GroupID], s)
	}
	uc.cachedETag = fmt.Sprintf(`W/"%s-%d"`, strconv.Itoa(len(groups)), maxUpdated)
	uc.cacheExpiresAt = time.Now().Add(activityCacheTTL)
	return nil
}

// InvalidateCache сбрасывает кэш. Вызывать после admin-мутаций справочников.
func (uc *ActivityUseCase) InvalidateCache() {
	uc.mu.Lock()
	defer uc.mu.Unlock()
	uc.cacheExpiresAt = time.Time{}
	uc.cachedETag = ""
}

func groupToResponse(g *domain.ActivityGroup) domain.ActivityGroupResponse {
	return domain.ActivityGroupResponse{
		ID:          g.ID,
		Code:        g.Code,
		DisplayName: g.DisplayName,
		Description: g.Description,
		IsActive:    g.IsActive,
		SortOrder:   g.SortOrder,
	}
}

func subtypeToResponse(s *domain.ActivitySubtype, groupCode string) domain.ActivitySubtypeResponse {
	return domain.ActivitySubtypeResponse{
		ID:               s.ID,
		GroupID:          s.GroupID,
		GroupCode:        groupCode,
		Code:             s.Code,
		DisplayName:      s.DisplayName,
		Description:      s.Description,
		IsActive:         s.IsActive,
		SortOrder:        s.SortOrder,
		CabinetSchemaKey: s.CabinetSchemaKey,
	}
}
