import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const origin = 'https://taqdom.me'
const routes = [
  { file: 'index.html', path: '/', lang: 'en', ar: '/ar/' },
  { file: 'ar/index.html', path: '/ar/', lang: 'ar', en: '/' },
  ...['about', 'templates', 'features', 'pricing', 'faq', 'contact', 'privacy', 'terms'].flatMap((slug) => [
    { file: `${slug}/index.html`, path: `/${slug}/`, lang: 'en', ar: `/ar/${slug}/` },
    { file: `ar/${slug}/index.html`, path: `/ar/${slug}/`, lang: 'ar', en: `/${slug}/` },
  ]),
]
const problems = []
const read = async (path) => readFile(resolve(root, path), 'utf8')
const assert = (condition, message) => { if (!condition) problems.push(message) }

for (const route of routes) {
  let html
  try { html = await read(route.file) } catch {
    problems.push(`Missing built page: ${route.file}`)
    continue
  }
  const canonical = `${origin}${route.path}`
  assert(html.includes(`<html lang="${route.lang}"`), `${route.file}: wrong HTML language`)
  assert(html.includes(`<link rel="canonical" href="${canonical}"`), `${route.file}: missing or incorrect canonical URL`)
  assert(html.includes(`hreflang="en" href="${origin}${route.lang === 'en' ? route.path : route.en}"`), `${route.file}: English hreflang does not match`)
  assert(html.includes(`hreflang="ar" href="${origin}${route.lang === 'ar' ? route.path : route.ar}"`), `${route.file}: Arabic hreflang does not match`)
  assert(/<title>[^<]{4,180}<\/title>/.test(html), `${route.file}: missing useful title`)
  assert(/<meta name="description" content="[^"]{40,190}"\s*\/>/.test(html), `${route.file}: missing or too-short description`)
  assert(html.includes('application/ld+json'), `${route.file}: missing structured data`)
  assert(html.includes('type="module"') && /src="\/assets\/[^" ]+\.js"/.test(html), `${route.file}: missing built app entry point`)
}

let sitemap = ''
let robots = ''
try { sitemap = await read('sitemap.xml') } catch { problems.push('Missing dist/sitemap.xml') }
try { robots = await read('robots.txt') } catch { problems.push('Missing dist/robots.txt') }
try { await read('404.html') } catch { problems.push('Missing dist/404.html') }
try { await read('site.webmanifest') } catch { problems.push('Missing dist/site.webmanifest') }

if (sitemap) {
  const locs = [...sitemap.matchAll(/<loc>(https:\/\/taqdom\.me[^<]+)<\/loc>/g)].map((m) => m[1])
  const expected = routes.map((route) => `${origin}${route.path}`).sort()
  assert(locs.length === routes.length, `Sitemap should contain ${routes.length} canonical URLs; found ${locs.length}`)
  assert(new Set(locs).size === locs.length, 'Sitemap contains duplicate URLs')
  assert(JSON.stringify(locs.sort()) === JSON.stringify(expected), 'Sitemap URLs do not match the published route inventory')
  assert((sitemap.match(/hreflang="en"/g) || []).length >= routes.length, 'Sitemap is missing English hreflang alternates')
  assert((sitemap.match(/hreflang="ar"/g) || []).length >= routes.length, 'Sitemap is missing Arabic hreflang alternates')
}
if (robots) {
  assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt does not advertise sitemap.xml')
  assert(robots.includes('Disallow: /api/'), 'robots.txt should keep API endpoints out of crawl discovery')
}

if (problems.length) {
  console.error('SEO checks failed:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exitCode = 1
} else {
  console.log(`SEO checks passed for ${routes.length} English/Arabic HTML routes, canonical/hreflang metadata, schema, sitemap, robots.txt, and support files.`)
}
