-- Reserve one unique, case-insensitive subdomain per portfolio.
-- Existing NULL/empty slugs are excluded until they are assigned.
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_slug_unique
  ON portfolios(lower(slug))
  WHERE slug IS NOT NULL AND slug <> '';
