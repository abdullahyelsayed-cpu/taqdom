function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function cleanText(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function safeImageUrl(value, origin) {
  const raw = String(value || '').trim()
  if (/^\/api\/media\/[a-f0-9-]{10,100}$/i.test(raw)) return new URL(raw, origin).href
  try {
    const url = new URL(raw, origin)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

function replaceMeta(html, selector, value) {
  const escaped = escapeHtml(value)
  const re = new RegExp('(<meta\\s+' + selector + '\\s+content=")[^"]*("\\s*/?>)', 'i')
  return html.replace(re, '$1' + escaped + '$2')
}

function replaceTitle(html, title) {
  return html.replace(/<title>[^<]*<\\/title>/i, '<title>' + escapeHtml(title) + '</title>')
}

function replaceCanonical(html, canonical) {
  return html.replace(/(<link\\s+rel="canonical"\\s+href=")[^"]*("[^>]*>)/i, '$1' + escapeHtml(canonical) + '$2')
}

function replaceRobots(html, robots) {
  return replaceMeta(html, 'name="robots"', robots)
}

function injectPortfolioSeo(html, portfolio, canonical, origin) {
  const documentData = portfolio?.document || {}
  const name = cleanText(documentData.name || portfolio?.title || 'Taqdom', 120)
  const role = cleanText(documentData.role, 180)
  const bio = cleanText(documentData.bio, 220)
  const description = cleanText(bio || role || 'A personal portfolio created with Taqdom.', 160)
  const title = name + ' — ' + (role || 'Personal Portfolio')
  const image = safeImageUrl(documentData.avatarUrl, origin)
  let output = replaceTitle(html, title)
  output = replaceCanonical(output, canonical)
  output = replaceRobots(output, 'index, follow, max-image-preview:large')
  output = replaceMeta(output, 'name="description"', description)
  output = replaceMeta(output, 'property="og:title"', title)
  output = replaceMeta(output, 'property="og:description"', description)
  output = replaceMeta(output, 'property="og:url"', canonical)
  output = replaceMeta(output, 'property="og:image"', image || new URL('/taqdom-og-card.svg', origin).href)
  output = replaceMeta(output, 'property="og:image:alt"', name)
  output = replaceMeta(output, 'name="twitter:title"', title)
  output = replaceMeta(output, 'name="twitter:description"', description)
  output = replaceMeta(output, 'name="twitter:image"', image || new URL('/taqdom-og-card.svg', origin).href)
  return output
}

export async function onRequest(context) {
  let html = await context.env.ASSETS.fetch(new URL('/', context.request.url)).then(response => response.text())
  const rawIdentifier = String(context.params?.catchall || '').replace(/^\/+|\/+$/g, '')
  if (!rawIdentifier || rawIdentifier.includes('/')) {
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } })
  }

  const api = context.env.TAQDOM_API
  if (api) {
    try {
      const response = await api.fetch(new Request('https://taqdom-api.internal/api/portfolios/public/' + encodeURIComponent(rawIdentifier)))
      if (response.ok) {
        const payload = await response.json()
        const portfolio = payload?.portfolio
        const host = context.request.headers.get('host') || new URL(context.request.url).host
        const tenant = context.request.headers.get('X-Taqdom-Tenant') || ''
        const tenantHost = tenant && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(tenant) ? tenant + '.taqdom.me' : ''
        const isTenantHost = host.endsWith('.taqdom.me') && host !== 'taqdom.me'
        const canonical = tenantHost
          ? 'https://' + tenantHost + '/'
          : isTenantHost
            ? 'https://' + host + '/'
            : new URL(context.request.url).origin + '/p/' + encodeURIComponent(portfolio?.slug || rawIdentifier)
        html = injectPortfolioSeo(html, portfolio, canonical, new URL(context.request.url).origin)
      } else {
        html = html.replace(/<meta\\s+name="robots"\\s+content="[^"]*"\\s*\\/?>/i, '<meta name="robots" content="noindex, follow">')
      }
    } catch {
      // Keep the SPA fallback usable when the internal API is temporarily unavailable.
    }
  }

  const headers = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
    'vary': 'Host',
  }
  return new Response(html, { status: 200, headers })
}
