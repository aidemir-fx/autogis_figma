-- First migration: Enable PostGIS and create tables
-- This file is for reference. GORM handles migrations automatically on startup.
-- If you need manual migrations, use golang-migrate or apply these directly.

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    working_phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer',
    coordinates JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Masters table
CREATE TABLE IF NOT EXISTS masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    working_phone VARCHAR(20),
    description TEXT,
    address TEXT,
    coordinates JSONB,
    status VARCHAR(20) DEFAULT 'schedule',
    current_status VARCHAR(20) DEFAULT 'unavailable',
    rating FLOAT DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    work_from TIME,
    work_to TIME,
    working_days TEXT[],
    professions TEXT[],
    auto_marks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_masters_user_id ON masters(user_id);
CREATE INDEX IF NOT EXISTS idx_masters_status ON masters(status);

-- Activity types table
CREATE TABLE IF NOT EXISTS activity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_types_name ON activity_types(name);
CREATE INDEX IF NOT EXISTS idx_activity_types_is_active ON activity_types(is_active);

-- User activity types table (many-to-many)
CREATE TABLE IF NOT EXISTS user_activity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type_id UUID NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activity_types_user_id ON user_activity_types(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_types_activity_type_id ON user_activity_types(activity_type_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activity_types_unique ON user_activity_types(user_id, activity_type_id);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type_id UUID NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT '',
    car_brand VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    time_preference VARCHAR(32),
    phone VARCHAR(20) NOT NULL DEFAULT '',
    photo_asset_ids TEXT[],
    price DECIMAL(10,2),
    confirmed_at TIMESTAMPTZ,
    cancel_reason TEXT,
    chat_id UUID,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider_id ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_activity_type_id ON orders(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_chat_id ON orders(chat_id);
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_at ON orders(confirmed_at);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_from_id ON reviews(from_id);
CREATE INDEX IF NOT EXISTS idx_reviews_to_id ON reviews(to_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);

-- Auto wash table
CREATE TABLE IF NOT EXISTS auto_washes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'schedule',
    services TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auto_washes_user_id ON auto_washes(user_id);

-- Additional auto wash services
CREATE TABLE IF NOT EXISTS additional_aw_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auto_wash_id UUID NOT NULL REFERENCES auto_washes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_additional_aw_services_auto_wash_id ON additional_aw_services(auto_wash_id);

-- Auto shop table
CREATE TABLE IF NOT EXISTS auto_shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'schedule',
    services TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auto_shops_user_id ON auto_shops(user_id);

-- Additional auto shop services
CREATE TABLE IF NOT EXISTS additional_as_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auto_shop_id UUID NOT NULL REFERENCES auto_shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_additional_as_services_auto_shop_id ON additional_as_services(auto_shop_id);

-- Auto service table
CREATE TABLE IF NOT EXISTS auto_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    working_phone VARCHAR(20),
    description TEXT,
    address TEXT,
    coordinates JSONB,
    status VARCHAR(20) DEFAULT 'schedule',
    work_from TIME,
    work_to TIME,
    working_days TEXT[],
    services TEXT[],
    professions TEXT[],
    has_parking BOOLEAN DEFAULT FALSE,
    lift_count INTEGER DEFAULT 0,
    warranty BOOLEAN DEFAULT FALSE,
    hotline VARCHAR(32),
    brand_support TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auto_services_user_id ON auto_services(user_id);
