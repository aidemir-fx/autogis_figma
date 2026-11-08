-- Master profile showcase data used by the mobile public profile.
ALTER TABLE masters
    ADD COLUMN IF NOT EXISTS features TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS work_photo_asset_ids TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS hero_work_photo_asset_ids TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_media_assets_work_entity
    ON media_assets(entity_type, entity_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS master_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, master_id)
);

CREATE INDEX IF NOT EXISTS idx_master_favorites_user ON master_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_master_favorites_master ON master_favorites(master_id);
