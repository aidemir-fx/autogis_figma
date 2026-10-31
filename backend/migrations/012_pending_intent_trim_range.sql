-- Migration 012: store the selected video segment for media processing.
-- Existing image uploads use the zero defaults and are unaffected.

ALTER TABLE pending_intents
    ADD COLUMN IF NOT EXISTS trim_start DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE pending_intents
    ADD COLUMN IF NOT EXISTS trim_end DOUBLE PRECISION NOT NULL DEFAULT 0;