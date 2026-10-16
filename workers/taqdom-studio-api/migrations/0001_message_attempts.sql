-- Non-destructive migration for contact-form rate limiting.
CREATE TABLE IF NOT EXISTS message_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_message_attempts_ip_created
  ON message_attempts (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_message_attempts_ip_portfolio_created
  ON message_attempts (ip_hash, portfolio_id, created_at);
