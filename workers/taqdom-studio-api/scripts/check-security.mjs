import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../index.js', import.meta.url), 'utf8')
const checks = [
  ['public portfolios require published status', source.includes("AND status='published'")],
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
