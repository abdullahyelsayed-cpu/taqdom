import assert from 'node:assert/strict'
import router from '../index.js'
import { tenantFromHostname, isValidBrowserOrigin } from '../index.js'

const checks = []
async function test(name, fn) {
  try {
    await fn()
    checks.push({name, passed:true})
    console.log('PASS ' + name)
  } catch (error) {
    checks.push({name, passed:false})
    console.error('FAIL ' + name + '\\n' + String(error?.stack || error))
    process.exitCode = 1
  }
}
function req(url, options={}) {
  return new Request(url, options)
}
const originalFetch = globalThis.fetch
let captured

await test('extracts only one valid subdomain label', async () => {
  assert.equal(tenantFromHostname('alice.taqdom.me'), 'alice')
  assert.equal(tenantFromHostname('two.words.taqdom.me'), null)
  assert.equal(tenantFromHostname('taqdom.me'), null)
  assert.equal(tenantFromHostname('bad_label.taqdom.me'), null)
  assert.equal(tenantFromHostname('api.taqdom.me'), null)
  assert.equal(tenantFromHostname('www.taqdom.me'), null)
  assert.equal(tenantFromHostname('app.taqdom.me'), null)
})
await test('requires a same-host HTTPS browser origin', async () => {
  assert.equal(isValidBrowserOrigin('https://alice.taqdom.me', 'alice.taqdom.me'), true)
  assert.equal(isValidBrowserOrigin('https://evil.example', 'alice.taqdom.me'), false)
  assert.equal(isValidBrowserOrigin('http://alice.taqdom.me', 'alice.taqdom.me'), false)
  assert.equal(isValidBrowserOrigin('', 'alice.taqdom.me'), true)
})
await test('proxies tenant homepage to apex without changing browser host', async () => {
  globalThis.fetch = async upstream => {
    captured = {url:upstream.url,method:upstream.method,headers:new Headers(upstream.headers)}
    return new Response('<!doctype html><title>Taqdom</title>', {status:200,headers:{'content-type':'text/html'}})
  }
  const response = await router.fetch(req('https://alice.taqdom.me/'), {})
  assert.equal(response.status, 200)
  assert.equal(captured.url, 'https://taqdom.me/p/alice')
  assert.equal(captured.headers.get('Origin'), 'https://taqdom.me')
  assert.equal(captured.headers.get('X-Taqdom-Tenant'), 'alice')
  assert.equal(response.headers.get('x-taqdom-tenant'), 'alice')
  assert.match(await response.text(), /Taqdom/)
})
await test('proxies API requests and retains request body and query', async () => {
  globalThis.fetch = async upstream => {
    captured = {url:upstream.url,method:upstream.method,headers:new Headers(upstream.headers),body:await upstream.text()}
    return Response.json({ok:true})
  }
  const response = await router.fetch(req('https://alice.taqdom.me/api/messages?source=portfolio', {
    method:'POST',
    headers:{Origin:'https://alice.taqdom.me','Content-Type':'application/json'},
    body:JSON.stringify({message:'Hello'})
  }), {})
  assert.equal(response.status, 200)
  assert.equal(captured.url, 'https://taqdom.me/api/messages?source=portfolio')
  assert.equal(captured.method, 'POST')
  assert.equal(captured.headers.get('Origin'), 'https://taqdom.me')
  assert.deepEqual(JSON.parse(captured.body), {message:'Hello'})
})
await test('rejects cross-origin browser writes before proxying', async () => {
  let called = false
  globalThis.fetch = async () => { called = true; return new Response('unexpected') }
  const response = await router.fetch(req('https://alice.taqdom.me/api/auth/logout', {
    method:'POST',
    headers:{Origin:'https://evil.example','Content-Type':'application/json'},
    body:'{}'
  }), {})
  assert.equal(response.status, 403)
  assert.equal(called, false)
})
await test('rejects multi-level and malformed tenant hosts', async () => {
  const deep = await router.fetch(req('https://a.b.taqdom.me/'), {})
  const malformed = await router.fetch(req('https://bad_label.taqdom.me/'), {})
  const reserved = await router.fetch(req('https://api.taqdom.me/'), {})
  assert.equal(deep.status, 404)
  assert.equal(malformed.status, 404)
  assert.equal(reserved.status, 404)
})
await test('blocks authenticated API routes on tenant hosts', async () => {
  let called = false
  globalThis.fetch = async () => { called = true; return new Response('unexpected') }
  const response = await router.fetch(req('https://alice.taqdom.me/api/auth/me', {
    headers:{Cookie:'__Host-taqdom_session=secret-session','Origin':'https://alice.taqdom.me'}
  }), {})
  assert.equal(response.status, 404)
  assert.equal(called, false)
})

await test('does not forward tenant-host cookies or authorization headers', async () => {
  globalThis.fetch = async upstream => {
    captured = {url:upstream.url,headers:new Headers(upstream.headers)}
    return new Response('sent', {status:201,headers:{'cache-control':'no-store'}})
  }
  const response = await router.fetch(req('https://alice.taqdom.me/api/messages', {
    method:'POST',
    headers:{
      Cookie:'__Host-taqdom_session=tenant-session',
      Authorization:'Bearer tenant-token',
      Origin:'https://alice.taqdom.me',
      'Content-Type':'application/json'
    },
    body:JSON.stringify({portfolioId:'abc',message:'Hello'})
  }), {})
  assert.equal(response.status, 201)
  assert.equal(captured.url, 'https://taqdom.me/api/messages')
  assert.equal(captured.headers.get('Cookie'), null)
  assert.equal(captured.headers.get('Authorization'), null)
  assert.equal(captured.headers.get('Origin'), 'https://taqdom.me')
})
globalThis.fetch = originalFetch
console.log('\\n' + checks.filter(item => item.passed).length + '/' + checks.length + ' tenant router tests passed.')
if (checks.some(item => !item.passed)) process.exitCode = 1
