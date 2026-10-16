import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import worker from '../index.js'

if (!globalThis.crypto) globalThis.crypto = webcrypto

const allowedOrigin = 'https://taqdom.me'
const sessionCookie = '__Host-taqdom_session=test-session-token'
const portfolioId = '11111111-1111-4111-8111-111111111111'
const userRow = {
  id: 'user-1',
  email: 'test@example.invalid',
  display_name: 'Test User',
  locale: 'en',
  email_verified: 0,
  created_at: '2026-01-01 00:00:00'
}

function createDb(options = {}) {
  const calls = []
  const db = {
    calls,
    prepare(sql) {
      const call = { sql, values: [] }
      calls.push(call)
      const statement = {
        bind(...values) {
          call.values = values
          return statement
        },
        async first() {
          if (sql.includes('JOIN users')) return options.userRow || null
          if (sql.includes('SELECT mime_type, data_base64 FROM media')) return options.mediaRow || null
          if (sql.includes('SELECT COUNT(*) AS total, COALESCE(SUM(length(data_base64)),0) AS bytes FROM media')) return options.mediaUsage || { total: 0, bytes: 0 }
          if (sql.includes('SELECT id FROM portfolios WHERE lower(slug)=lower(?)')) {
            const candidate = String(call.values[0] || '').toLowerCase()
            const excluded = call.values[1]
            return options.slugExists &&
              options.slugExists.toLowerCase() === candidate &&
              (options.slugExistsOwnerId === undefined || options.slugExistsOwnerId !== excluded)
              ? { id: 'another-portfolio' }
              : null
          }
          if (sql.includes('SELECT status,slug FROM portfolios WHERE id=? AND owner_id=?')) {
            return options.currentPortfolioStatus
              ? { status: options.currentPortfolioStatus, slug: Object.prototype.hasOwnProperty.call(options, 'currentPortfolioSlug') ? options.currentPortfolioSlug : 'existing-handle' }
              : null
          }
          if (sql.includes('FROM portfolios WHERE (id=? OR slug=? COLLATE NOCASE)')) return options.publicPortfolio || null
          if (sql.includes("SELECT id FROM portfolios WHERE id=? AND status='published'")) {
            return options.publishedTarget ? { id: portfolioId } : null
          }
          if (sql.includes('SELECT status FROM portfolios WHERE id=? AND owner_id=?')) {
            return options.currentPortfolioStatus ? { status: options.currentPortfolioStatus } : null
          }
          if (sql.includes('SELECT id,title,template_id,slug,document_json,status,created_at,updated_at FROM portfolios WHERE id=? AND owner_id=?')) {
            const insert = calls.find(item => item.sql?.includes('INSERT INTO portfolios (id,owner_id,title,template_id,slug,status,document_json)'))
            const values = insert?.values || []
            return options.createdPortfolio || {
              id: call.values[0],
              title: values[2] || 'New portfolio',
              template_id: values[3] || 'design-0',
              slug: values[4] || 'site-test00',
              status: values[5] || 'draft',
              document_json: values[6] || '{}',
              created_at: '2026-01-01 00:00:00',
              updated_at: '2026-01-01 00:00:00'
            }
          }
          if (sql.includes('SELECT id FROM portfolios WHERE id=? AND owner_id=?')) {
            return options.ownerPortfolio ? { id: portfolioId } : null
          }
          if (sql.includes('SELECT COUNT(*) AS total FROM portfolios')) return { total: 0 }
          if (sql.includes('SELECT COUNT(*) AS total FROM auth_attempts')) return { total: 1 }
          return null
        },
        async all() {
          return { results: options.allResults || [] }
        },
        async run() {
          if (sql.includes('INSERT INTO message_attempts')) {
            return { meta: { changes: options.quotaChanges ?? 1 } }
          }
          if (sql.includes('INSERT INTO messages')) calls.push({kind: 'insert-message'})
          if (sql.includes('INSERT INTO media')) calls.push({kind: 'insert-media', values: call.values})
          if (sql.includes('UPDATE portfolios SET title')) calls.push({kind: 'update-portfolio', values: call.values})
          if (sql.includes('INSERT INTO portfolios (id,owner_id,title,template_id,slug,status,document_json)')) calls.push({kind: 'insert-portfolio', values: call.values})
          return { meta: { changes: options.runChanges ?? 1 } }
        }
      }
      return statement
    }
  }
  return db
}

function makeEnv(db = createDb()) {
  return {
    TAQDOM_DB: db,
    AI: { async run() { return { response: 'Test response' } } },
    MODEL: '@cf/meta/llama-3.1-8b-instruct-fast',
    ALLOWED_ORIGINS: 'https://taqdom.me,https://www.taqdom.me,https://taqdom-studio-preview.pages.dev'
  }
}

function makeRequest(path, { method = 'GET', body, origin = allowedOrigin, cookie } = {}) {
  const headers = new Headers()
  if (origin !== null) headers.set('Origin', origin)
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (cookie) headers.set('Cookie', cookie)
  return new Request(new URL(path, 'https://taqdom.me'), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

async function invoke(path, options = {}, env = makeEnv()) {
  const response = await worker.fetch(makeRequest(path, options), env)
  return { response, body: await response.clone().json().catch(() => null), env }
}

const results = []
async function test(name, fn) {
  try {
    await fn()
    results.push({ name, passed: true })
    console.log('PASS ' + name)
  } catch (error) {
    results.push({ name, passed: false, error: String(error?.stack || error) })
    console.error('FAIL ' + name + '\\n' + String(error?.stack || error))
    process.exitCode = 1
  }
}

await test('health endpoint confirms API and D1 binding', async () => {
  const { response, body } = await invoke('/api/health')
  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.databaseConfigured, true)
})

await test('unapproved origins are rejected without reflected CORS permission', async () => {
  const { response } = await invoke('/api/health', { origin: 'https://attacker.pages.dev' })
  assert.equal(response.status, 403)
  assert.equal(response.headers.get('access-control-allow-origin'), null)
})

await test('public portfolio query filters by published status', async () => {
  const db = createDb()
  const { response, body } = await invoke('/api/portfolios/public/not-found', {}, makeEnv(db))
  assert.equal(response.status, 404)
  const query = db.calls.find(call => call.sql.includes('FROM portfolios WHERE (id=? OR slug=? COLLATE NOCASE)'))
  assert.ok(query, 'public portfolio query should run')
  assert.match(query.sql, /status='published'/)
  assert.equal(body.error, 'not_found')
})

await test('a published portfolio can be returned by the public route', async () => {
  const db = createDb({
    publicPortfolio: {
      id: portfolioId,
      title: 'Published Test',
      template_id: 'design-0',
      slug: 'published-test',
      status: 'published',
      document_json: JSON.stringify({ name: 'Published Test', projects: [] }),
      updated_at: '2026-01-01 00:00:00'
    }
  })
  const { response, body } = await invoke('/api/portfolios/public/published-test', {}, makeEnv(db))
  assert.equal(response.status, 200)
  assert.equal(body.portfolio.status, 'published')
  assert.equal(body.portfolio.title, 'Published Test')
})

await test('contact form cannot send to a draft or missing portfolio', async () => {
  const db = createDb({ publishedTarget: false })
  const { response, body } = await invoke('/api/messages', {
    method: 'POST',
    body: { portfolioId, senderName: 'Visitor', senderEmail: 'visitor@example.invalid', message: 'Hello there' }
  }, makeEnv(db))
  assert.equal(response.status, 404)
  assert.equal(body.error, 'not_found')
  assert.equal(db.calls.some(call => call.sql?.includes('INSERT INTO messages')), false)
})

await test('contact form returns 429 when the rate-limit quota is exhausted', async () => {
  const db = createDb({ publishedTarget: true, quotaChanges: 0 })
  const { response, body } = await invoke('/api/messages', {
    method: 'POST',
    body: { portfolioId, senderName: 'Visitor', senderEmail: 'visitor@example.invalid', message: 'Hello there' }
  }, makeEnv(db))
  assert.equal(response.status, 429)
  assert.equal(body.error, 'message_rate_limit')
  assert.equal(db.calls.some(call => call.sql?.includes('INSERT INTO messages')), false)
})

await test('contact form accepts a valid request under the test quota', async () => {
  const db = createDb({ publishedTarget: true, quotaChanges: 1 })
  const { response, body } = await invoke('/api/messages', {
    method: 'POST',
    body: { portfolioId, senderName: 'Visitor', senderEmail: 'visitor@example.invalid', message: 'Hello there' }
  }, makeEnv(db))
  assert.equal(response.status, 201)
  assert.equal(body.ok, true)
  assert.equal(db.calls.some(call => call.kind === 'insert-message'), true)
})

await test('oversized streamed JSON bodies are rejected', async () => {
  const db = createDb()
  const { response, body } = await invoke('/api/messages', {
    method: 'POST',
    body: { portfolioId, message: 'x'.repeat(9000) }
  }, makeEnv(db))
  assert.equal(response.status, 413)
  assert.equal(body.error, 'request_too_large')
  assert.equal(db.calls.length, 0)
})

await test('AI endpoint rejects oversized JSON bodies even without Content-Length', async () => {
  const db = createDb()
  const { response, body } = await invoke('/api/ai/improve', {
    method: 'POST',
    body: { text: 'x'.repeat(15000), kind: 'bio', locale: 'en' }
  }, makeEnv(db))
  assert.equal(response.status, 413)
  assert.equal(body.error, 'request_too_large')
  assert.equal(db.calls.length, 0)
})

await test('unauthenticated users cannot read portfolio inbox messages', async () => {
  const { response, body } = await invoke('/api/messages/' + portfolioId, { origin: allowedOrigin })
  assert.equal(response.status, 401)
  assert.equal(body.error, 'not_authenticated')
})

await test('SVG uploads are rejected for an authenticated user', async () => {
  const db = createDb({ userRow })
  const env = makeEnv(db)
  const { response, body } = await invoke('/api/media', {
    method: 'POST',
    cookie: sessionCookie,
    body: { data: 'data:image/svg+xml;base64,PHN2Zy8+' }
  }, env)
  assert.equal(response.status, 400)
  assert.equal(body.error, 'unsupported_or_invalid_image')
  assert.equal(db.calls.some(call => call.sql?.includes('INSERT INTO media')), false)
})

await test('per-account media quota blocks excess image uploads', async () => {
  const db = createDb({ userRow, mediaUsage: { total: 75, bytes: 1000 } })
  const bytes = new Uint8Array(16)
  bytes.set([255, 216, 255], 0)
  bytes.set([255, 217], bytes.length - 2)
  const base64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
  const { response, body } = await invoke('/api/media', {
    method: 'POST', cookie: sessionCookie,
    body: { data: 'data:image/jpeg;base64,' + base64 }
  }, makeEnv(db))
  assert.equal(response.status, 429)
  assert.equal(body.error, 'media_limit_reached')
  assert.equal(db.calls.some(call => call.kind === 'insert-media'), false)
})

await test('JPEG uploads pass type/signature validation for authenticated users', async () => {
  const db = createDb({ userRow })
  const env = makeEnv(db)
  const bytes = new Uint8Array(16)
  bytes.set([255, 216, 255], 0)
  bytes.set([255, 217], bytes.length - 2)
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('')
  const base64 = btoa(binary)
  const { response, body } = await invoke('/api/media', {
    method: 'POST',
    cookie: sessionCookie,
    body: { data: 'data:image/jpeg;base64,' + base64 }
  }, env)
  assert.equal(response.status, 201)
  assert.equal(body.ok, true)
  assert.equal(db.calls.some(call => call.kind === 'insert-media'), true)
})

await test('legacy SVG media cannot be served as a public asset', async () => {
  const db = createDb({ mediaRow: { mime_type: 'image/svg+xml', data_base64: 'PHN2Zy8+' } })
  const response = await worker.fetch(makeRequest('/api/media/legacy-svg'), makeEnv(db))
  assert.equal(response.status, 415)
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.match(response.headers.get('Content-Security-Policy') || '', /sandbox/)
})

await test('reserved subdomains are rejected', async () => {
  const db = createDb({ userRow })
  const { response, body } = await invoke('/api/portfolios', {
    method: 'POST',
    cookie: sessionCookie,
    body: {
      slug: 'www',
      title: 'My portfolio',
      templateId: 'design-0',
      document: { name: 'My portfolio', projects: [] }
    }
  }, makeEnv(db))
  assert.equal(response.status, 400)
  assert.equal(body.error, 'invalid_subdomain')
  assert.equal(db.calls.some(call => call.sql?.includes('INSERT INTO portfolios (id,owner_id,title,template_id,slug,status,document_json)')), false)
})

await test('custom subdomain is stored on portfolio creation', async () => {
  const db = createDb({ userRow })
  const { response, body } = await invoke('/api/portfolios', {
    method: 'POST',
    cookie: sessionCookie,
    body: {
      slug: 'abdullah-creative',
      title: 'My portfolio',
      templateId: 'design-0',
      status: 'published',
      document: {
        name: 'My portfolio',
        projects: ['A polished case study', 'Unsafe project'],
        projectDetails: [
          { description: 'A complete product redesign.', url: 'example.com/case-study', imageUrl: '/api/media/11111111-1111-4111-8111-111111111111' },
          { description: 'Invalid links are removed.', url: 'javascript:alert(1)', imageUrl: 'javascript:alert(1)' }
        ],
        skills: ['Product design', 'Figma', '', 'x'.repeat(100)],
        experience: [
          { role: 'Product Designer', company: 'Studio Nūn', period: '2024–present', description: 'Designed accessible tools.' },
          { role: '', company: '', period: '', description: '' }
        ],
        socialLinks: [
          { label: 'LinkedIn', url: 'linkedin.com/in/test' },
          { label: 'Unsafe', url: 'javascript:alert(1)' },
          { label: '', url: 'https://example.com' }
        ],
        visible: { about:true, skills:true, experience:true, projects:true, socials:true, contact:true },
        sectionOrder: ['projects', 'about', 'skills', 'projects', 'unknown'],
        backgroundStyle: 'glass',
        availableForWork: true,
        avatarUrl: 'javascript:alert(1)'
      }
    }
  }, makeEnv(db))
  assert.equal(response.status, 201)
  assert.equal(body.portfolio.slug, 'abdullah-creative')
  assert.equal(body.portfolio.status, 'published')
  const insert = db.calls.find(call => call.kind === 'insert-portfolio')
  assert.ok(insert)
  assert.equal(insert.values[4], 'abdullah-creative')
  const savedDocument = JSON.parse(insert.values[6])
  assert.equal(savedDocument.backgroundStyle, 'glass')
  assert.equal(savedDocument.availableForWork, true)
  assert.equal(savedDocument.avatarUrl, '')
  assert.equal(savedDocument.projectDetails[0].description, 'A complete product redesign.')
  assert.equal(savedDocument.projectDetails[0].url, 'https://example.com/case-study')
  assert.equal(savedDocument.projectDetails[0].imageUrl, '/api/media/11111111-1111-4111-8111-111111111111')
  assert.equal(savedDocument.projectDetails[1].url, '')
  assert.equal(savedDocument.projectDetails[1].imageUrl, '')
  assert.deepEqual(savedDocument.skills, ['Product design', 'Figma', 'x'.repeat(80)])
  assert.deepEqual(savedDocument.experience, [{role:'Product Designer',company:'Studio Nūn',period:'2024–present',description:'Designed accessible tools.'}])
  assert.deepEqual(savedDocument.socialLinks, [{label:'LinkedIn',url:'https://linkedin.com/in/test'}])
  assert.equal(savedDocument.visible.skills, true)
  assert.equal(savedDocument.visible.experience, true)
  assert.equal(savedDocument.visible.socials, true)
  assert.deepEqual(savedDocument.sectionOrder, ['projects','about','skills','experience','socials','contact'])
})

await test('default subdomain uses a readable username-based handle', async () => {
  const db = createDb({ userRow })
  const { response, body } = await invoke('/api/portfolios', {
    method: 'POST',
    cookie: sessionCookie,
    body: {
      title: 'My portfolio',
      templateId: 'design-0',
      document: { name: 'My portfolio', projects: [] }
    }
  }, makeEnv(db))
  assert.equal(response.status, 201)
  assert.match(body.portfolio.slug, /^test-[0-9a-f]{6}$/)
})

await test('subdomains cannot be claimed by a second portfolio', async () => {
  const db = createDb({ userRow, slugExists: 'team-portfolio' })
  const { response, body } = await invoke('/api/portfolios', {
    method: 'POST',
    cookie: sessionCookie,
    body: {
      slug: 'team-portfolio',
      title: 'My portfolio',
      templateId: 'design-0',
      document: { name: 'My portfolio', projects: [] }
    }
  }, makeEnv(db))
  assert.equal(response.status, 409)
  assert.equal(body.error, 'subdomain_taken')
  assert.equal(db.calls.some(call => call.sql?.includes('INSERT INTO portfolios (id,owner_id,title,template_id,slug,status,document_json)')), false)
})

await test('owner can change a portfolio subdomain without changing publish status', async () => {
  const db = createDb({ userRow, currentPortfolioStatus: 'published', currentPortfolioSlug: 'old-handle' })
  const { response, body } = await invoke('/api/portfolios/' + portfolioId, {
    method: 'PUT',
    cookie: sessionCookie,
    body: {
      slug: 'new-handle',
      title: 'Updated title',
      templateId: 'design-0',
      document: { name: 'Updated title', projects: [] }
    }
  }, makeEnv(db))
  assert.equal(response.status, 200)
  assert.equal(body.status, 'published')
  const update = db.calls.find(call => call.kind === 'update-portfolio')
  assert.ok(update)
  assert.equal(update.values[2], 'published')
  assert.equal(update.values[3], 'new-handle')
})

await test('autosave still supports a legacy portfolio with no slug', async () => {
  const db = createDb({ userRow, currentPortfolioStatus: 'published', currentPortfolioSlug: null })
  const { response, body } = await invoke('/api/portfolios/' + portfolioId, {
    method: 'PUT',
    cookie: sessionCookie,
    body: {
      title: 'Legacy site',
      templateId: 'design-0',
      document: { name: 'Legacy site', projects: [] }
    }
  }, makeEnv(db))
  assert.equal(response.status, 200)
  assert.equal(body.status, 'published')
  const update = db.calls.find(call => call.kind === 'update-portfolio')
  assert.ok(update)
  assert.equal(update.values[2], 'published')
  assert.equal(update.values[3], null)
})

await test('autosave still supports a legacy Arabic slug until the owner changes it', async () => {
  const db = createDb({ userRow, currentPortfolioStatus: 'draft', currentPortfolioSlug: 'مشروعي-قديم' })
  const { response, body } = await invoke('/api/portfolios/' + portfolioId, {
    method: 'PUT',
    cookie: sessionCookie,
    body: {
      title: 'Legacy site',
      templateId: 'design-0',
      document: { name: 'Legacy site', projects: [] }
    }
  }, makeEnv(db))
  assert.equal(response.status, 200)
  assert.equal(body.status, 'draft')
  const update = db.calls.find(call => call.kind === 'update-portfolio')
  assert.ok(update)
  assert.equal(update.values[3], 'مشروعي-قديم')
})

await test('autosave preserves published status if status is omitted', async () => {
  const db = createDb({ userRow, currentPortfolioStatus: 'published' })
  const env = makeEnv(db)
  const { response, body } = await invoke('/api/portfolios/' + portfolioId, {
    method: 'PUT',
    cookie: sessionCookie,
    body: {
      title: 'Updated title',
      templateId: 'design-0',
      document: { name: 'Updated title', projects: [] }
    }
  }, env)
  assert.equal(response.status, 200)
  assert.equal(body.status, 'published')
  const update = db.calls.find(call => call.kind === 'update-portfolio')
  assert.ok(update, 'update query should be executed')
  assert.equal(update.values[2], 'published')
})

console.log('\\n' + results.filter(result => result.passed).length + '/' + results.length + ' API smoke tests passed.')
if (results.some(result => !result.passed)) process.exitCode = 1
