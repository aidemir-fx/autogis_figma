-- 006: Add auto_shop as a single-level activity group.
-- Auto-магазин не имеет подтипов на UI, поэтому заводим один
-- синтетический подтип `general`, чтобы сохранить NOT NULL-инвариант
-- `user_activity_profiles.activity_subtype_id` и FK-композит
-- (activity_subtype_id, activity_group_id) без изменения схемы.

INSERT INTO activity_groups (code, display_name, description, is_active, sort_order) VALUES
    ('auto_shop', 'Автомагазин', 'Магазины запчастей, шин и автохимии', TRUE, 40)
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
    ('auto_shop', 'general', 'Автомагазин', 'Магазин автозапчастей, шин, расходников и автохимии', 10, 'auto_shop.general')
) AS v(group_code, code, display_name, description, sort_order, schema_key)
ON g.code = v.group_code
ON CONFLICT (group_id, code) DO UPDATE SET
    display_name       = EXCLUDED.display_name,
    description        = EXCLUDED.description,
    is_active          = EXCLUDED.is_active,
    sort_order         = EXCLUDED.sort_order,
    cabinet_schema_key = EXCLUDED.cabinet_schema_key,
    updated_at         = NOW();
