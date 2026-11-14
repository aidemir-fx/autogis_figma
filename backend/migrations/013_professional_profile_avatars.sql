-- Separate public profile avatars from personal account avatars.
ALTER TABLE masters
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE auto_services
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE auto_shops
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE auto_washes
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;
