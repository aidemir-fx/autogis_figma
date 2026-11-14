-- Saved auto-service profiles for authenticated customers.
CREATE TABLE IF NOT EXISTS auto_service_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auto_service_id UUID NOT NULL REFERENCES auto_services(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT idx_auto_service_favorite_pair UNIQUE (user_id, auto_service_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_service_favorites_user_id ON auto_service_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_service_favorites_service_id ON auto_service_favorites(auto_service_id);
