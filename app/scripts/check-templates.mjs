import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const studioCss = await readFile(new URL('../src/studio.css', import.meta.url), 'utf8')
const exportSource = await readFile(new URL('../src/lib/portfolio-export.ts', import.meta.url), 'utf8')
const apiSource = await readFile(new URL('../../workers/taqdom-studio-api/index.js', import.meta.url), 'utf8')

const expected = ['Nexus', 'Forma', 'Pulse', 'Lumen', 'Vertex', 'Mono', 'Eclipse', 'Zenith', 'Vortex']
const layoutMatch = app.match(/const layouts = \[([^\]]+)\]/)
assert.ok(layoutMatch, 'layout names should be declared')
const layouts = [...layoutMatch[1].matchAll(/'([^']+)'/g)].map(match => match[1])
assert.deepEqual(layouts, expected, 'template systems and visual order must match the nine-signature design board')

const jobsStart = app.indexOf('const jobs = [')
const layoutsStart = app.indexOf('const layouts = [', jobsStart)
assert.ok(jobsStart >= 0 && layoutsStart > jobsStart, 'profession categories should be present')
const jobBlock = app.slice(jobsStart, layoutsStart)
const professionCount = [...jobBlock.matchAll(/\['[a-z]+'/g)].length
assert.equal(professionCount, 14, 'the library should keep all 14 profession categories')

assert.ok(app.includes('const featured = templates.slice(0, 9)'), 'the landing gallery should show all nine systems')
assert.ok(app.includes('template-board-preview mini-site-'), 'gallery cards should show miniature website previews')
assert.ok(app.includes('const stylePales = ['), 'each layout should have its own base palette')
assert.ok(app.includes('layouts.map((_, l) =>'), 'each profession should be combined with every style')

for (let index = 0; index < expected.length; index += 1) {
  assert.ok(studioCss.includes(`.portfolio-site.layout-${index}`), `${expected[index]} should have public-portfolio styling`)
  assert.ok(studioCss.includes(`.mini-site-${index}`), `${expected[index]} should have gallery-preview styling`)
  assert.ok(studioCss.includes(`.template-mini-${index}`), `${expected[index]} should have an editor swatch`)
}

assert.ok(app.includes('126 Starting Combinations'), 'homepage copy should show the correct combination count')
assert.ok(!app.includes('five shared layout systems'), 'outdated five-layout copy should be removed')
assert.ok(app.includes('site-atmosphere atmosphere-'), 'each public portfolio should mount an ambient background layer')
assert.ok(app.includes('background-mood-options'), 'studio should expose background presets in the editor')
for (const mood of ['signature', 'aurora', 'glass', 'orbit', 'calm']) {
  assert.ok(app.includes(`id: '${mood}'`), `${mood} background preset should be available in English and Arabic`)
  assert.ok(studioCss.includes(`.mood-${mood}`), `${mood} background preset should have visual styling`)
}
assert.ok(apiSource.includes('const allowedBackgroundStyles = ["signature", "aurora", "glass", "orbit", "calm"]'), 'API must allowlist persisted background presets')
assert.ok(apiSource.includes('    backgroundStyle,'), 'API must save the selected background preset')
assert.ok(apiSource.includes('const projectDetails = Array.isArray(input.projectDetails)'), 'API must accept project descriptions, links, and covers')
assert.ok(apiSource.includes('    projectDetails,'), 'API must persist project details')
assert.ok(apiSource.includes('const imageUrl = /^\\/api\\/media\\/'), 'project covers must be restricted to uploaded media or trusted HTTPS URLs')
assert.ok(app.includes('type ProjectDetail ='), 'editor must model project descriptions, URLs, and images')
assert.ok(app.includes('const handleProjectImageFile = async'), 'editor must support uploading individual project covers')
assert.ok(app.includes('project-image-editor'), 'editor must provide per-project cover controls')
assert.ok(app.includes('const projectUrl=safeExternalUrl(detail.url)'), 'public templates must render sanitized project links')
assert.ok(exportSource.includes('const detail = portfolio.projectDetails?.[index] || {}'), 'HTML export must include project metadata')
assert.ok(exportSource.includes('const cover = safeImageUrl(detail.imageUrl)'), 'HTML export must retain project cover images')
assert.ok(exportSource.includes('function safeExternalUrl(value: string | undefined)'), 'HTML export must validate project destinations')
assert.ok(exportSource.includes('const themePalettes = ['), 'HTML export must define theme-specific palettes')
assert.equal((exportSource.match(/page: '#/g) || []).length, 9, 'HTML export must keep all nine template palette definitions')
assert.ok(exportSource.includes('class="theme-${layout} mood-${mood}"'), 'HTML export must preserve selected template and atmosphere')
assert.ok(exportSource.includes('class="ambient"'), 'HTML export must preserve atmospheric backgrounds')
assert.ok(studioCss.includes('.site-atmosphere:before'), 'ambient gradient mesh should be available')
assert.ok(studioCss.includes('backdrop-filter:blur(22px)'), 'glassmorphism surfaces should be available')
assert.ok(studioCss.includes('@keyframes taqdom-atmosphere-breathe'), 'ambient light should have gentle motion')
assert.ok(studioCss.includes('@media(prefers-reduced-motion:reduce)'), 'ambient motion must respect reduced-motion preference')
for (let index = 0; index < expected.length; index += 1) {
  assert.ok(studioCss.includes(`.portfolio-site.layout-${index}{--mood-glow-a:`), `${expected[index]} should own an atmosphere palette`)
  assert.ok(studioCss.includes(`.mini-site-${index}{--preview-glow:`), `${expected[index]} should own a gallery glow palette`)
}
assert.ok(!studioCss.includes('var(--accent)0b') && !studioCss.includes('var(--accent)2b') && !studioCss.includes('var(--accent)18'), 'accent color alpha must use valid CSS color-mix instead of invalid hex suffixes')
console.log(`PASS: ${layouts.length} visual systems × ${professionCount} profession categories = ${layouts.length * professionCount} starting combinations`)
console.log('PASS: public templates, gallery mockups, editor swatches, and localized counts are in sync')
console.log('PASS: all themes include ambient glow, layered backgrounds, glass surfaces, and reduced-motion support')
