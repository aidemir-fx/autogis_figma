-- Keep persisted user fields aligned with the current registration/profile model.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_professional BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS agreed_to_privacy BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS privacy_agreed_at TIMESTAMP;

-- Preserve legacy contact numbers when the old column is still present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'working_phone'
    ) THEN
        UPDATE users
        SET contact_number = working_phone
        WHERE contact_number IS NULL AND working_phone IS NOT NULL;
    END IF;
END $$;