-- Live queue is mutually exclusive with online booking for masters and auto services.
ALTER TABLE masters
    ADD COLUMN IF NOT EXISTS live_queue_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE auto_services
    ADD COLUMN IF NOT EXISTS live_queue_enabled BOOLEAN NOT NULL DEFAULT FALSE;
