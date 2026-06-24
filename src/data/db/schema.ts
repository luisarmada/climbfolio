export const schemaVersion = 7;

export const createSchemaSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER,
  grading_scale_type TEXT NOT NULL DEFAULT 'v_scale',
  grading_scale_name TEXT NOT NULL DEFAULT 'V Scale',
  grading_scale_grades_json TEXT NOT NULL DEFAULT '["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10+"]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS climbs (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  colour TEXT,
  hold_types_json TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER,
  attempt_count INTEGER NOT NULL,
  completed INTEGER NOT NULL,
  rest_before_climb_seconds INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY NOT NULL,
  climb_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  rest_since_previous_attempt_seconds INTEGER,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (climb_id) REFERENCES climbs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  climber_type TEXT NOT NULL,
  badge_preference TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS climbing_preferences (
  id TEXT PRIMARY KEY NOT NULL,
  default_climb_grade TEXT NOT NULL,
  default_quick_grade TEXT NOT NULL,
  require_colour_selection INTEGER NOT NULL,
  grading_scale_type TEXT NOT NULL DEFAULT 'v_scale',
  selected_grading_scale_id TEXT NOT NULL DEFAULT 'v_scale',
  custom_grading_scale_name TEXT NOT NULL DEFAULT 'Custom',
  custom_grades_json TEXT NOT NULL DEFAULT '[]',
  custom_scales_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions(end_time, deleted_at);

CREATE INDEX IF NOT EXISTS idx_climbs_session
  ON climbs(session_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_climbs_active
  ON climbs(session_id, end_time, deleted_at);

CREATE INDEX IF NOT EXISTS idx_attempts_climb
  ON attempts(climb_id, attempt_number, deleted_at);
`;
