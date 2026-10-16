import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const studioCss = await readFile(new URL('../src/studio.css', import.meta.url), 'utf8')

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
console.log(`PASS: ${layouts.length} visual systems × ${professionCount} profession categories = ${layouts.length * professionCount} starting combinations`)
console.log('PASS: public templates, gallery mockups, editor swatches, and localized counts are in sync')
