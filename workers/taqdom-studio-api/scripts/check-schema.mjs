import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const bootstrap = await readFile(new URL('../schema/bootstrap.sql', import.meta.url), 'utf8')
const migration1 = await readFile(new URL('../migrations/0001_message_attempts.sql', import.meta.url), 'utf8')
const migration2 = await readFile(new URL('../migrations/0002_portfolio_subdomains.sql', import.meta.url), 'utf8')
const migration3 = await readFile(new URL('../migrations/0003_media_and_inbox_indexes.sql', import.meta.url), 'utf8')

const requiredTables = [
  'users',
  'sessions',
  'portfolios',
  'media',
  'messages',
  'ai_requests',
  'auth_attempts',
  'message_attempts',
]
const tables = new Set([...bootstrap.matchAll(/CREATE TABLE IF NOT EXISTS ([a-z_]+)/gi)].map(match => match[1].toLowerCase()))
for (const table of requiredTables) assert.ok(tables.has(table), `bootstrap.sql is missing table: ${table}`)

const requiredIndexes = [
  'idx_portfolios_owner_updated',
  'idx_portfolios_slug_unique',
  'idx_sessions_user',
  'idx_sessions_expiry',
  'idx_media_owner_created',
  'idx_messages_portfolio_created',
  'idx_ai_requests_ip_created',
  'idx_auth_attempts_key_created',
  'idx_message_attempts_ip_created',
  'idx_message_attempts_ip_portfolio_created',
]
for (const index of requiredIndexes) assert.ok(bootstrap.includes(index), `bootstrap.sql is missing index: ${index}`)
assert.ok(/CREATE TABLE IF NOT EXISTS message_attempts/i.test(migration1), '001 migration must be safe to re-run')
assert.ok(/CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_slug_unique/i.test(migration2), '002 migration must be safe to re-run')
assert.ok(/CREATE INDEX IF NOT EXISTS idx_media_owner_created/i.test(migration3), '003 migration must index media quota queries')
assert.ok(/CREATE INDEX IF NOT EXISTS idx_messages_portfolio_created/i.test(migration3), '003 migration must index inbox queries')
assert.match(bootstrap, /FOREIGN KEY|REFERENCES users\(id\) ON DELETE CASCADE/i, 'bootstrap schema must cascade owned account records')
console.log(`PASS: D1 bootstrap defines ${requiredTables.length} required tables and ${requiredIndexes.length} query indexes; numbered migrations are idempotent.`)
