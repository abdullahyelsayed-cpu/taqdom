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
