-- Master public profile details: selected work-photo cover and profile features.
-- Runtime startup also applies these columns through GORM AutoMigrate.

ALTER TABLE masters
    ADD COLUMN IF NOT EXISTS cover_image_asset_id UUID,
    ADD COLUMN IF NOT EXISTS has_parking BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_wifi BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_waiting_area BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS offers_coffee BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_evacuation BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_parts_in_stock BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS lift_count INTEGER NOT NULL DEFAULT 0;
