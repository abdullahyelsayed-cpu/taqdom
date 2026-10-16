-- Production hardening: optimistic portfolio saves, managed media ownership, and cleanup indexes.
-- Safe to apply after 0001_message_attempts.sql and 0002_portfolio_subdomains.sql.

ALTER TABLE portfolios ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE media ADD COLUMN portfolio_id TEXT;

CREATE INDEX IF NOT EXISTS idx_media_owner_created
  ON media (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_portfolio_created
  ON media (portfolio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_portfolio_created
  ON messages (portfolio_id, created_at DESC);
