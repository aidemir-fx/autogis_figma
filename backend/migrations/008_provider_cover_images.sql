-- Provider cover images shown in search cards, map balloons and detail pages.
-- GORM AutoMigrate adds the same columns at runtime; this file is for manual deployments.

ALTER TABLE auto_washes
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
    ADD COLUMN IF NOT EXISTS cover_image_asset_id UUID;

ALTER TABLE auto_shops
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
    ADD COLUMN IF NOT EXISTS cover_image_asset_id UUID;

ALTER TABLE auto_services
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
    ADD COLUMN IF NOT EXISTS cover_image_asset_id UUID;
