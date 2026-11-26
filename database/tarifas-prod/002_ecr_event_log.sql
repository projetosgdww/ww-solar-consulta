CREATE TABLE IF NOT EXISTS ecr_events (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 request_id TEXT NOT NULL UNIQUE,
 action TEXT NOT NULL CHECK(action IN ('save','approve','activate','restore_default')),
 version_id TEXT,
 expected_seq INTEGER NOT NULL CHECK(expected_seq>=0),
 actor_id TEXT NOT NULL CHECK(length(actor_id)=36),
 occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 draft_json TEXT,
 CHECK((action='save' AND version_id IS NOT NULL AND draft_json IS NOT NULL AND json_valid(draft_json)) OR (action IN ('approve','activate') AND version_id IS NOT NULL AND draft_json IS NULL) OR (action='restore_default' AND version_id IS NULL AND draft_json IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS ecr_save_unique ON ecr_events(version_id) WHERE action='save';
CREATE UNIQUE INDEX IF NOT EXISTS ecr_approve_unique ON ecr_events(version_id) WHERE action='approve';
CREATE INDEX IF NOT EXISTS ecr_event_action_seq ON ecr_events(action,seq);
CREATE TRIGGER IF NOT EXISTS ecr_no_update BEFORE UPDATE ON ecr_events BEGIN SELECT RAISE(ABORT,'append_only'); END;
CREATE TRIGGER IF NOT EXISTS ecr_no_delete BEFORE DELETE ON ecr_events BEGIN SELECT RAISE(ABORT,'append_only'); END;
CREATE TRIGGER IF NOT EXISTS ecr_validate_event BEFORE INSERT ON ecr_events BEGIN
 SELECT CASE WHEN NEW.expected_seq != COALESCE((SELECT MAX(seq) FROM ecr_events),0) THEN RAISE(ABORT,'stale_revision') END;
 SELECT CASE WHEN NEW.action='approve' AND NOT EXISTS(SELECT 1 FROM ecr_events WHERE action='save' AND version_id=NEW.version_id) THEN RAISE(ABORT,'unknown_version') END;
 SELECT CASE WHEN NEW.action='activate' AND NOT EXISTS(SELECT 1 FROM ecr_events WHERE action='approve' AND version_id=NEW.version_id) THEN RAISE(ABORT,'not_approved') END;
END;
