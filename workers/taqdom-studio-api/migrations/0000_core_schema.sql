-- Reproducible baseline for fresh D1 databases.
-- Additive/idempotent: safe to apply to an existing database too.
-- 0003_production_hardening.sql adds revision and portfolio_id later.

CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 display_name TEXT NOT NULL,
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 locale TEXT NOT NULL DEFAULT 'ar' CHECK(locale IN ('ar','en')),
 email_verified INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 expires_at TEXT NOT NULL,
 last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS portfolios (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL DEFAULT 'My portfolio',
 template_id TEXT NOT NULL DEFAULT 'design-0',
 document_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 slug TEXT
);

CREATE TABLE IF NOT EXISTS media (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 data_base64 TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY,
 portfolio_id TEXT NOT NULL,
 sender_name TEXT,
 sender_email TEXT,
 message TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_attempts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 attempt_key TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('login','register')),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 ip_hash TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose IN ('bio','headline','experience','project')),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_key_created
 ON auth_attempts(attempt_key, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_requests_ip_created
 ON ai_requests(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_portfolios_owner_updated
 ON portfolios(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry
 ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user
 ON sessions(user_id);
