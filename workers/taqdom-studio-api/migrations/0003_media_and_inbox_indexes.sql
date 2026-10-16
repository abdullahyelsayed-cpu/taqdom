-- Query-path indexes for media quotas and the saved inbox.
-- This migration is safe to apply to the existing production D1 database.
CREATE INDEX IF NOT EXISTS idx_media_owner_created
  ON media(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_portfolio_created
  ON messages(portfolio_id, created_at DESC);
