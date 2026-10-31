-- Migration 002: S3 media storage tables
-- Applied automatically by GORM AutoMigrate at startup.
-- This file is a reference copy for manual review / rollback planning.

-- ─── pending_intents ──────────────────────────────────────────────────────────
-- Holds upload source metadata until processing finishes or TTL cleanup.
-- Rows linked to processing assets are retained so lost jobs can be requeued.
CREATE TABLE IF NOT EXISTS pending_intents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    entity_type VARCHAR(20) NOT NULL,                    -- account | work | object
    entity_id   VARCHAR(64) NOT NULL,
    category    VARCHAR(20) NOT NULL,                    -- avatar | photo
    staging_key TEXT        NOT NULL UNIQUE,             -- uploads/tmp/{uuid}
    final_key   TEXT        NOT NULL,                    -- pre-generated destination key
    mime_type   VARCHAR(50) NOT NULL,
    size_bytes  BIGINT      NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_intents_user_id     ON pending_intents (user_id);
CREATE INDEX IF NOT EXISTS idx_pending_intents_expires_at  ON pending_intents (expires_at);

-- ─── media_assets ─────────────────────────────────────────────────────────────
-- Canonical record for every successfully submitted upload.
-- object_key is NULL while status = 'processing'; set by the image processor.
CREATE TABLE IF NOT EXISTS media_assets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type      VARCHAR(20)  NOT NULL,
    entity_id        VARCHAR(64)  NOT NULL,
    category         VARCHAR(20)  NOT NULL,
    intent_id        UUID         NOT NULL UNIQUE,       -- idempotency key for confirm-upload
    storage_bucket   VARCHAR(128) NOT NULL,
    object_key       TEXT         UNIQUE,                -- NULL until processor succeeds
    mime_type        VARCHAR(50)  NOT NULL,
    size_bytes       BIGINT       NOT NULL DEFAULT 0,
    checksum_sha256  VARCHAR(64),
    width            INT          NOT NULL DEFAULT 0,
    height           INT          NOT NULL DEFAULT 0,
    status           VARCHAR(20)  NOT NULL DEFAULT 'processing',
    created_by       UUID         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ                         -- soft delete
);

-- Composite index for entity media listing (most common query)
CREATE INDEX IF NOT EXISTS idx_media_assets_entity
    ON media_assets (entity_type, entity_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_deleted_at ON media_assets (deleted_at);

-- ─── media_derivatives ────────────────────────────────────────────────────────
-- Stores generated variants (thumb / medium / large) for each asset.
-- unique(asset_id, variant, format) prevents duplicate rows on processor retry.
CREATE TABLE IF NOT EXISTS media_derivatives (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id   UUID        NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    variant    VARCHAR(10) NOT NULL,   -- thumb | medium | large
    format     VARCHAR(10) NOT NULL,   -- jpeg | webp
    object_key TEXT        NOT NULL UNIQUE,
    mime_type  VARCHAR(50) NOT NULL,
    size_bytes BIGINT      NOT NULL DEFAULT 0,
    width      INT         NOT NULL DEFAULT 0,
    height     INT         NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_derivative UNIQUE (asset_id, variant, format)
);

CREATE INDEX IF NOT EXISTS idx_media_derivatives_asset_id ON media_derivatives (asset_id);

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS media_derivatives;
-- DROP TABLE IF EXISTS media_assets;
-- DROP TABLE IF EXISTS pending_intents;
