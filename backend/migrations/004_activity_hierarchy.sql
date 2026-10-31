-- 004: Two-level activity classification (activity_groups + activity_subtypes).
--
-- Вводит иерархию классификации деятельности провайдеров. Ключевые особенности:
--   * Композитный FK (subtype_id, group_id) гарантирует, что подтип принадлежит группе.
--   * Партиционный UNIQUE индекс гарантирует ровно один primary профиль на пользователя.
--   * Профильные таблицы (auto_washes, auto_services, masters) денормализованно хранят
--     activity_subtype_id для быстрых JOIN-ов в поиске.
--   * Идемпотентные операции: ON CONFLICT DO NOTHING при UPSERT в user_activity_profiles.
--
-- Выполнять в одной транзакции. При наличии данных выполняется backfill дефолтами.

BEGIN;

-- =============================================================================
-- 1. Справочники классификации
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_groups (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code         VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order   INTEGER     NOT NULL DEFAULT 100,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_subtypes (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id           UUID        NOT NULL REFERENCES activity_groups(id) ON DELETE RESTRICT,
    code               VARCHAR(64) NOT NULL,
    display_name       VARCHAR(128) NOT NULL,
    description        TEXT,
    is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order         INTEGER     NOT NULL DEFAULT 100,
    cabinet_schema_key VARCHAR(128) NOT NULL,
    settings_schema    JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_activity_subtypes_group_code UNIQUE (group_id, code),
    -- Ключ для композитного FK из user_activity_profiles:
    CONSTRAINT uq_activity_subtypes_id_group  UNIQUE (id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_subtypes_group_id   ON activity_subtypes(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_subtypes_active     ON activity_subtypes(group_id, is_active);

-- =============================================================================
-- 2. Source of truth: user_activity_profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_activity_profiles (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_group_id    UUID        NOT NULL REFERENCES activity_groups(id) ON DELETE RESTRICT,
    activity_subtype_id  UUID        NOT NULL,
    is_primary           BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Композитный FK: гарантирует, что пара (subtype_id, group_id) из user_activity_profiles
    -- действительно существует в activity_subtypes — никакого рассогласования group/subtype.
    CONSTRAINT fk_uap_subtype_group
        FOREIGN KEY (activity_subtype_id, activity_group_id)
        REFERENCES activity_subtypes(id, group_id)
        ON DELETE RESTRICT,
    -- Идемпотентность: один и тот же пользователь не может дважды выбрать один подтип.
    CONSTRAINT uq_user_activity_profiles UNIQUE (user_id, activity_group_id, activity_subtype_id)
);

CREATE INDEX IF NOT EXISTS idx_uap_user_id  ON user_activity_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_uap_subtype  ON user_activity_profiles(activity_subtype_id);

-- Партиционный UNIQUE: ровно один primary профиль на пользователя.
CREATE UNIQUE INDEX IF NOT EXISTS uq_uap_primary_per_user
    ON user_activity_profiles(user_id)
    WHERE is_primary = TRUE;

-- =============================================================================
-- 3. Журнал аудита
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   UUID,
    subject_user_id UUID        NOT NULL,
    action          VARCHAR(64) NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_audit_subject_created
    ON activity_audit_logs(subject_user_id, created_at DESC);

-- =============================================================================
-- 4. Денормализация на профильные таблицы
-- =============================================================================

ALTER TABLE auto_washes    ADD COLUMN IF NOT EXISTS activity_subtype_id UUID;
ALTER TABLE auto_services  ADD COLUMN IF NOT EXISTS activity_subtype_id UUID;
ALTER TABLE masters        ADD COLUMN IF NOT EXISTS activity_subtype_id UUID;

ALTER TABLE auto_washes    ADD COLUMN IF NOT EXISTS box_count         INTEGER;
ALTER TABLE auto_washes    ADD COLUMN IF NOT EXISTS washer_count      INTEGER;
ALTER TABLE auto_washes    ADD COLUMN IF NOT EXISTS has_waiting_area  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE auto_washes    ADD COLUMN IF NOT EXISTS payments          TEXT[];

-- Явный allow-list для payments — защищает от мусорных значений в массиве.
ALTER TABLE auto_washes
    DROP CONSTRAINT IF EXISTS chk_auto_washes_payments_allowed;
ALTER TABLE auto_washes
    ADD CONSTRAINT chk_auto_washes_payments_allowed
    CHECK (
        payments IS NULL
        OR payments <@ ARRAY['cash','card','qr','sbp','apple_pay','google_pay']::text[]
    );

CREATE INDEX IF NOT EXISTS idx_auto_washes_subtype    ON auto_washes(activity_subtype_id);
CREATE INDEX IF NOT EXISTS idx_auto_services_subtype  ON auto_services(activity_subtype_id);
CREATE INDEX IF NOT EXISTS idx_masters_subtype        ON masters(activity_subtype_id);

-- =============================================================================
-- 5. Seed справочников (идемпотентно)
-- =============================================================================

INSERT INTO activity_groups (code, display_name, description, is_active, sort_order) VALUES
    ('auto_wash',        'Автомойка',       'Автомойки и услуги детейлинга',       TRUE, 10),
    ('auto_service',     'Автосервис',      'Технический сервис и ремонт',         TRUE, 20),
    ('private_executor', 'Частный исполнитель', 'Индивидуальные исполнители',      TRUE, 30)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description  = EXCLUDED.description,
    is_active    = EXCLUDED.is_active,
    sort_order   = EXCLUDED.sort_order,
    updated_at   = NOW();

INSERT INTO activity_subtypes (group_id, code, display_name, description, is_active, sort_order, cabinet_schema_key)
SELECT g.id, v.code, v.display_name, v.description, TRUE, v.sort_order, v.schema_key
FROM activity_groups g
JOIN (VALUES
    ('auto_wash',        'classic',            'Классическая мойка',      'Ручная мойка с персоналом',          10, 'auto_wash.classic'),
    ('auto_wash',        'self_service',       'Мойка самообслуживания',  'Боксы самообслуживания',             20, 'auto_wash.self_service'),
    ('auto_wash',        'truck_wash',         'Мойка грузовиков',        'Мойка крупногабаритного транспорта', 30, 'auto_wash.truck_wash'),
    ('auto_service',     'general_service',    'Общий сервис',            'Общий авто-ремонт и диагностика',    10, 'auto_service.general'),
    ('auto_service',     'tire_fitting',       'Шиномонтаж',              'Шиномонтаж и балансировка',          20, 'auto_service.tire_fitting'),
    ('auto_service',     'detailing',          'Детейлинг',               'Полировка, химчистка, керамика',     30, 'auto_service.detailing'),
    ('private_executor', 'master',             'Частный мастер',          'Индивидуальный мастер',              10, 'private_executor.master'),
    ('private_executor', 'washer',             'Мойщик',                  'Мобильный мойщик',                   20, 'private_executor.washer'),
    ('private_executor', 'tire_specialist',    'Шиномонтажник',           'Мобильный шиномонтажник',            30, 'private_executor.tire_specialist')
) AS v(group_code, code, display_name, description, sort_order, schema_key)
ON g.code = v.group_code
ON CONFLICT (group_id, code) DO UPDATE SET
    display_name       = EXCLUDED.display_name,
    description        = EXCLUDED.description,
    is_active          = EXCLUDED.is_active,
    sort_order         = EXCLUDED.sort_order,
    cabinet_schema_key = EXCLUDED.cabinet_schema_key,
    updated_at         = NOW();

-- =============================================================================
-- 6. Backfill существующих профилей дефолтными подтипами
-- =============================================================================

-- auto_washes → auto_wash.classic
UPDATE auto_washes aw
SET activity_subtype_id = s.id
FROM activity_subtypes s
JOIN activity_groups g ON g.id = s.group_id
WHERE aw.activity_subtype_id IS NULL
  AND g.code = 'auto_wash'
  AND s.code = 'classic';

-- auto_services → auto_service.general_service
UPDATE auto_services ass
SET activity_subtype_id = s.id
FROM activity_subtypes s
JOIN activity_groups g ON g.id = s.group_id
WHERE ass.activity_subtype_id IS NULL
  AND g.code = 'auto_service'
  AND s.code = 'general_service';

-- masters → private_executor.master
UPDATE masters m
SET activity_subtype_id = s.id
FROM activity_subtypes s
JOIN activity_groups g ON g.id = s.group_id
WHERE m.activity_subtype_id IS NULL
  AND g.code = 'private_executor'
  AND s.code = 'master';

-- =============================================================================
-- 7. Backfill user_activity_profiles из существующих профильных таблиц
--    Сначала все записи вставляем с is_primary=FALSE (чтобы не ломать partial
--    unique uq_uap_primary_per_user у пользователей с несколькими профилями),
--    потом отдельным шагом промотируем самый ранний профиль каждого пользователя.
-- =============================================================================

INSERT INTO user_activity_profiles (user_id, activity_group_id, activity_subtype_id, is_primary)
SELECT aw.user_id, s.group_id, s.id, FALSE
FROM auto_washes aw
JOIN activity_subtypes s ON s.id = aw.activity_subtype_id
WHERE aw.activity_subtype_id IS NOT NULL
ON CONFLICT (user_id, activity_group_id, activity_subtype_id) DO NOTHING;

INSERT INTO user_activity_profiles (user_id, activity_group_id, activity_subtype_id, is_primary)
SELECT ass.user_id, s.group_id, s.id, FALSE
FROM auto_services ass
JOIN activity_subtypes s ON s.id = ass.activity_subtype_id
WHERE ass.activity_subtype_id IS NOT NULL
ON CONFLICT (user_id, activity_group_id, activity_subtype_id) DO NOTHING;

INSERT INTO user_activity_profiles (user_id, activity_group_id, activity_subtype_id, is_primary)
SELECT m.user_id, s.group_id, s.id, FALSE
FROM masters m
JOIN activity_subtypes s ON s.id = m.activity_subtype_id
WHERE m.activity_subtype_id IS NOT NULL
ON CONFLICT (user_id, activity_group_id, activity_subtype_id) DO NOTHING;

-- Промоушн primary: по одной записи на пользователя без primary.
UPDATE user_activity_profiles
SET is_primary = TRUE, updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT ON (user_id) id
    FROM user_activity_profiles
    WHERE user_id NOT IN (
        SELECT user_id FROM user_activity_profiles WHERE is_primary = TRUE
    )
    ORDER BY user_id, created_at ASC, id ASC
);

COMMIT;
