/* eslint-disable @typescript-eslint/no-require-imports -- Server route fixtures without database access. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } })
const { test } = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path')
const { createElement } = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..'), original = Module._load
let artists = [], queries = []
Module._load = function (request, parent, main) {
  if (request === '@/lib/prisma') return { prisma: { artist: { findMany: async query => { queries.push(query); return artists } } } }
  if (request.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
  if (request === 'next/link') return { __esModule: true, default: ({ href, children }) => createElement('a', { href }, children) }
  if (request === '@/app/components/UiText') return { CategoryLabel: ({ value }) => ({ narodne: 'Narodne', domace: 'Zabavne', strane: 'Strane' })[value] || value }
  if (request === '@/app/components/ArtistImage') return { __esModule: true, default: ({ name }) => createElement('span', null, name[0]) }
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  return original.call(this, request, parent, main)
}
let page
try { page = require('../app/pesme/[category]/slovo/[letter]/page.tsx').default } finally { Module._load = original }
const artist = (name, slug = name) => ({ id: slug, name, slug, image: null, songs: [{ id: 's1', performers: [] }], performances: [{ songId: 's1' }, { songId: 's2' }] })
const render = async (category, letter) => renderToStaticMarkup(await page({ params: Promise.resolve({ category, letter }) }))

test('each song letter page reuses its own optimized category photograph with one readable heading', async () => {
  artists = [artist('Artist A', 'artist-a')]; queries = []
  for (const [category, image, label] of [['narodne', 'categoryNarodne', 'Narodne'], ['domace', 'categoryDomace', 'Zabavne'], ['strane', 'categoryStrane', 'Strane']]) {
    const html = await render(category, 'a')
    assert.equal((html.match(/<h1>/g) || []).length, 1)
    assert.equal((html.match(/<img /g) || []).length, 1)
    assert.match(html, new RegExp('/images/optimized/' + image + '-'))
    assert.ok(html.includes(label + ' – A'))
    assert.match(html, /alt=""/)
    assert.match(html, /loading="eager"/)
    assert.match(html, /srcSet=/)
    assert.ok(html.includes(`/pesme/${category}/artist-a`))
    assert.match(html, /Artist A \(2\)/)
  }
  assert.deepEqual(queries.map(query => query.where.category), ['narodne', 'domace', 'strane'])
})

test('photo addition preserves letter filtering, duet exclusion and numeric pages', async () => {
  artists = [artist('Artist A'), artist('Band B'), artist('123 Band'), { ...artist('Artist A & Band B'), songs: [{ id: 'duet', performers: [{ artistId: 'a' }, { artistId: 'b' }] }] }]
  const a = await render('domace', 'a')
  assert.match(a, /Artist A \(2\)/); assert.doesNotMatch(a, /Band B|123 Band|duet/)
  assert.match(await render('domace', 'num'), /123 Band \(2\)/)
  assert.doesNotMatch(await render('domace', 'num'), /Artist A|Band B \(2\)/)
  assert.match(await render('domace', 'z'), /Nema izvođača na ovo slovo/)
})
