ALTER TABLE matches
  ADD COLUMN controller_token VARCHAR(64) NULL,
  ADD COLUMN controller_heartbeat_at DATETIME(3) NULL;
