-- 005: Professional application submit form v2 bridge.
-- Adds new activity hierarchy fields and keeps legacy columns for read compatibility.

ALTER TABLE business_applications
    ADD COLUMN IF NOT EXISTS activity_group_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS activity_subtype_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS applicant_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS yandex_maps_url TEXT;

ALTER TABLE business_applications
    ALTER COLUMN business_name DROP NOT NULL;

ALTER TABLE business_applications
    ALTER COLUMN contact_person DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_applications_group_status
    ON business_applications(activity_group_code, status);

CREATE INDEX IF NOT EXISTS idx_business_applications_subtype_status
    ON business_applications(activity_subtype_code, status);

UPDATE business_applications
SET activity_group_code = CASE business_type
    WHEN 'auto_service' THEN 'auto_service'
    WHEN 'tire_fitting' THEN 'auto_service'
    WHEN 'detailing' THEN 'auto_service'
    WHEN 'station' THEN 'auto_service'
    WHEN 'auto_wash' THEN 'auto_wash'
    WHEN 'master' THEN 'private_executor'
    ELSE activity_group_code
END
WHERE activity_group_code IS NULL;

UPDATE business_applications
SET activity_subtype_code = CASE business_type
    WHEN 'auto_service' THEN 'general_service'
    WHEN 'tire_fitting' THEN 'tire_fitting'
    WHEN 'detailing' THEN 'detailing'
    WHEN 'station' THEN 'general_service'
    WHEN 'auto_wash' THEN 'classic'
    WHEN 'master' THEN 'master'
    ELSE activity_subtype_code
END
WHERE activity_subtype_code IS NULL;
