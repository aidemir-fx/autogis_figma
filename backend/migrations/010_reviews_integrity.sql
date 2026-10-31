-- Reviews are tied to completed orders. Existing nullable order_id rows are kept
-- for backward compatibility, while all new order reviews use the unique index.
ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE auto_washes
    ADD COLUMN IF NOT EXISTS rating REAL NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE auto_shops
    ADD COLUMN IF NOT EXISTS rating REAL NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE auto_services
    ADD COLUMN IF NOT EXISTS rating REAL NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_order_author
    ON reviews(order_id, from_id)
    WHERE order_id IS NOT NULL;
