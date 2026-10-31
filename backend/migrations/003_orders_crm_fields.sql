-- 003: Add mini-CRM order fields for provider workflow and chat linkage.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS car_brand VARCHAR(255),
    ADD COLUMN IF NOT EXISTS time_preference VARCHAR(32),
    ADD COLUMN IF NOT EXISTS photo_asset_ids TEXT[],
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS chat_id UUID;

UPDATE orders
SET
    name = COALESCE(name, ''),
    car_brand = COALESCE(car_brand, ''),
    phone = COALESCE(phone, ''),
    chat_id = COALESCE(chat_id, id::uuid)
WHERE name IS NULL
   OR car_brand IS NULL
   OR phone IS NULL
   OR chat_id IS NULL;

ALTER TABLE orders
    ALTER COLUMN name SET DEFAULT '',
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN car_brand SET DEFAULT '',
    ALTER COLUMN car_brand SET NOT NULL,
    ALTER COLUMN phone SET DEFAULT '',
    ALTER COLUMN phone SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_chat_id ON orders(chat_id);
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_at ON orders(confirmed_at);
