-- Provider status modes:
--   schedule    = work according to saved working_days/work_from/work_to
--   unavailable = closed manually
--
-- Runtime migrations in cmd/server/main.go apply the same changes on startup.

ALTER TABLE masters
    ALTER COLUMN status SET DEFAULT 'schedule',
    ALTER COLUMN current_status SET DEFAULT 'unavailable';

ALTER TABLE auto_washes
    ALTER COLUMN status SET DEFAULT 'schedule';

ALTER TABLE auto_shops
    ALTER COLUMN status SET DEFAULT 'schedule';

ALTER TABLE auto_services
    ALTER COLUMN status SET DEFAULT 'schedule';

UPDATE masters
SET status = 'schedule'
WHERE status = 'available';

UPDATE masters
SET current_status = 'unavailable'
WHERE current_status IN ('available', 'schedule');

UPDATE auto_washes
SET status = 'schedule'
WHERE status = 'available';

UPDATE auto_shops
SET status = 'schedule'
WHERE status = 'available';

UPDATE auto_services
SET status = 'schedule'
WHERE status = 'available';
