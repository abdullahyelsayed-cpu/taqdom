const APEX_ORIGIN = 'https://taqdom.me'
const RESERVED_SUBDOMAINS = new Set([
  'www','api','app','admin','assets','static','cdn','mail','smtp','ftp',
  'support','help','status','docs','blog','dev','staging','preview','dashboard',
  'auth','login','register','pricing','about','templates','features','contact',
  'privacy','terms','taqdom',
])
const SAFE_METHODS = new Set(['GET','HEAD','OPTIONS'])

function tenantFromHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const suffix = '.taqdom.me'
  if (!host.endsWith(suffix)) return null
  const label = host.slice(0, -suffix.length)
  if (!label || label.includes('.') || label.length > 63) return null
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) return null
  if (RESERVED_SUBDOMAINS.has(label)) return null
  return label
}

function isValidBrowserOrigin(origin, hostname) {
  if (!origin) return true
  try {
    const value = new URL(origin)
    return value.protocol === 'https:' && value.hostname.toLowerCase() === hostname.toLowerCase()
  } catch {
    return false
  }
}

function jsonError(message, status) {
  return Response.json({ error: message }, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url)
    const host = incoming.hostname.toLowerCase()
    const tenant = tenantFromHostname(host)
    if (!tenant) return jsonError('invalid_tenant_host', 404)

    const origin = request.headers.get('Origin')
    if (!isValidBrowserOrigin(origin, host)) return jsonError('origin_not_allowed', 403)
    if (!SAFE_METHODS.has(request.method) && request.headers.get('Sec-Fetch-Site') === 'cross-site') {
      return jsonError('cross_site_request_blocked', 403)
    }
    if (!['GET','HEAD','OPTIONS','POST','PUT','PATCH','DELETE'].includes(request.method)) {
      return jsonError('method_not_allowed', 405)
    }

    // Tenant hosts serve public portfolios only; authentication, inbox, AI and
    // account mutations must remain on the apex host, never pass a tenant cookie.
    if (incoming.pathname.startsWith('/api/')) {
      const isPublicRead =
        (request.method === 'GET' || request.method === 'HEAD') &&
        (incoming.pathname.startsWith('/api/portfolios/public/') ||
          incoming.pathname.startsWith('/api/media/') ||
          incoming.pathname === '/api/health')
      const isContactSubmission = incoming.pathname === '/api/messages' && request.method === 'POST'
      if (!isPublicRead && !isContactSubmission) return jsonError('tenant_api_route_blocked', 404)
    } else if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      return jsonError('tenant_write_route_blocked', 403)
    }

    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.delete('content-length')
    // A tenant-origin cookie must never be forwarded to the apex API.
    headers.delete('cookie')
    headers.delete('authorization')
    headers.set('Origin', APEX_ORIGIN)
    headers.set('X-Taqdom-Tenant', tenant)

    const target = new URL(incoming.pathname + incoming.search, APEX_ORIGIN)
    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer()

    try {
      const upstream = await fetch(new Request(target, init))
      const responseHeaders = new Headers(upstream.headers)
      responseHeaders.set('x-content-type-options', 'nosniff')
      responseHeaders.set('referrer-policy', 'strict-origin-when-cross-origin')
      responseHeaders.set('x-taqdom-tenant', tenant)
      if (origin) {
        responseHeaders.set('access-control-allow-origin', origin)
        const vary = responseHeaders.get('vary') || ''
        if (!vary.toLowerCase().split(',').map(value => value.trim()).includes('origin')) {
          responseHeaders.set('vary', vary ? vary + ', Origin' : 'Origin')
        }
      }
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      })
    } catch {
      return jsonError('tenant_origin_unavailable', 502)
    }
  },
}

export { isValidBrowserOrigin, tenantFromHostname }
