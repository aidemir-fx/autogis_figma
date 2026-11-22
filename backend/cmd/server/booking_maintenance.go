package main

import (
	"context"
	"log"
	"time"

	"github.com/gmt061/autogis-backend/internal/domain"
	"gorm.io/gorm"
)

func startBookingMaintenance(ctx context.Context, db *gorm.DB, verificationEnabled bool) {
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		lastProofCleanup := time.Time{}
		for {
			now := time.Now()
			if err := db.WithContext(ctx).Model(&domain.Order{}).
				Where("status = ? AND response_deadline_at <= ?", domain.OrderStatusPending, now).
				Update("status", domain.OrderStatusExpired).Error; err != nil && ctx.Err() == nil {
				log.Printf("[maintenance] expire booking requests: %v", err)
			}
			if verificationEnabled && now.Sub(lastProofCleanup) >= time.Hour {
				if err := db.WithContext(ctx).Exec("DELETE FROM phone_verification_attempts WHERE created_at < ?", now.Add(-24*time.Hour)).Error; err != nil && ctx.Err() == nil {
					log.Printf("[maintenance] clean phone verification attempts: %v", err)
				}
				lastProofCleanup = now
			}
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
		}
	}()
}
