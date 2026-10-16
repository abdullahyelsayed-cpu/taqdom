import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../index.js', import.meta.url), 'utf8')
const checks = [
  ['public portfolios require published status', source.includes("AND status='published'")],
  ['portfolio handles are validated against a reserved-name list', source.includes('function isValidSubdomain(value)') && source.includes('RESERVED_SUBDOMAINS')],
  ['portfolio creation stores a supplied handle', source.includes('const requestedSlug = normalizeSubdomain(body.slug)')],
  ['background style is allowlisted before persistence', source.includes('const allowedBackgroundStyles = ["signature", "aurora", "glass", "orbit", "calm"]')],
  ['background style is retained in portfolio documents', source.includes('    backgroundStyle,')],

  ['portfolio updates preserve a handle unless requested', source.includes('const handleWasProvided = body.slug !== void 0') && source.includes('const requestedSlug = handleWasProvided ? normalizeSubdomain(body.slug) : existingPortfolio.slug')],
  ['portfolio handle updates are written to the database', source.includes('SET title=?,template_id=?,status=?,slug=?,document_json=')],
  ['portfolio updates use optimistic revisions', source.includes('portfolio_conflict') && source.includes('revision=?,updated_at=datetime')],
  ['managed media is tied to the owning portfolio when provided', source.includes('portfolio_id') && source.includes('INSERT INTO media (id, owner_id, portfolio_id')],
  ['media deletion is owner-scoped', source.includes('DELETE FROM media WHERE id=? AND owner_id=?')],
  ['portfolio deletion cleans related messages and media', source.includes('DELETE FROM messages WHERE portfolio_id=?') && source.includes('DELETE FROM media WHERE owner_id=? AND portfolio_id=?')],
  ['account deletion removes stored account data', source.includes('path === "/api/auth/account"') && source.includes('DELETE FROM users WHERE id=?')],
  ['signed-in password changes rehash the password and revoke other sessions', source.includes('path === "/api/auth/password"') && source.includes('DELETE FROM sessions WHERE user_id=? AND token_hash<>?')],

  ['AI route uses the same bounded JSON parser', source.includes('const parsed = await readJson(request, 12e3)')],
  ['autosave preserves an unchanged portfolio status', source.includes('existingPortfolio.status')],
  ['uploads validate raster image signatures', source.includes('function validRasterImage') && source.includes('!validRasterImage(b64, mimeType)')],
  ['public media adds nosniff protection', source.includes('"X-Content-Type-Options": "nosniff"')],
  ['contact form rate limiter is present', source.includes('message_attempts') && source.includes('message_rate_limit')],
  ['origin validation uses configured exact allowlist', source.includes('return Boolean(origin) && origins.has(origin);')],
  ['permissive arbitrary-origin reflection is absent', !source.includes('else if (origin) headers["access-control-allow-origin"] = origin;')],
]

for (const [label, passed] of checks) {
  if (!passed) {
    console.error(`FAIL: ${label}`)
    process.exitCode = 1
  } else {
    console.log(`PASS: ${label}`)
  }
}

if (process.exitCode) {
  assert.fail('API Worker security checks failed')
}
