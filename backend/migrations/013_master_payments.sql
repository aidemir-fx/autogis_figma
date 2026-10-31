-- Add payment methods to master profiles. Existing profiles start with no methods.
ALTER TABLE masters
    ADD COLUMN IF NOT EXISTS payments TEXT[] NOT NULL DEFAULT '{}';