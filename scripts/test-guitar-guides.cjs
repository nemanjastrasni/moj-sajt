/* eslint-disable @typescript-eslint/no-require-imports -- Render public guides without a browser or live database. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } })
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), Module = require('node:module')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server'), { load } = require('cheerio')
const root = path.resolve(__dirname, '..'), original = Module._load
let locale = 'sr'
Module._load = function(request, parent, main) {
  if (request === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) }
  if (request === 'next/navigation') return { notFound: () => { throw Object.assign(Error('Not found'), { status: 404 }) } }
  if (request === './UiText' && parent.filename.endsWith('GuideText.tsx')) return { useI18n: () => ({ locale }) }
  if (request === 'next/cache') return { unstable_cache: fn => fn }
  if (request === '@/lib/prisma') return { prisma: new Proxy({}, { get() { throw Error('Guides must not query the database') } }) }
  if (request.endsWith('.css')) return { __esModule: true, default: {} }
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  return original.call(this, request, parent, main)
}
let guides, detail, index, maps
try {
  guides = require('../lib/guitarGuides.ts')
  detail = require('../app/vodici/[slug]/page.tsx')
  index = require('../app/vodici/page.tsx')
  maps = require('../lib/seo/sitemaps.ts')
} finally { Module._load = original }
const props = slug => ({ params: Promise.resolve({ slug }) })

test('every public guide renders substantive Serbian and English HTML with resolvable section anchors', async () => {
  for (const lang of ['sr', 'en']) for (const guide of guides.guitarGuides) {
    locale = lang
    const $ = load(renderToStaticMarkup(await detail.default(props(guide.slug))))
    assert.equal($('h1').text(), guide.title[lang])
    assert.ok($('article > section p').text().length > 1000)
    assert.equal($('nav[aria-labelledby="guide-contents"] ol li').length, guide.sections.length)
    for (const anchor of $('a[href^="#"]').toArray()) assert.equal($('[id="' + $(anchor).attr('href').slice(1) + '"]').length, 1)
    for (const paragraph of guide.sections.flatMap(section => section.paragraphs)) assert.ok($('article').text().includes(paragraph[lang]))
    assert.equal($('script[type="application/ld+json"]').length, 1)
    assert.ok($('a[href="/vodici"]').length > 0)
  }
  locale = 'sr'
})

test('guide routes have matching canonicals, generated routes, hub links and sitemap entries', async () => {
  assert.equal(detail.dynamicParams, false)
  assert.deepEqual(detail.generateStaticParams(), guides.guitarGuides.map(({ slug }) => ({ slug })))
  const $ = load(renderToStaticMarkup(index.default()))
  assert.ok(maps.sitemapStaticPaths.includes('/vodici'))
  for (const guide of guides.guitarGuides) {
    const url = guides.guidePath(guide.slug), metadata = await detail.generateMetadata(props(guide.slug))
    assert.ok($(`a[href="${url}"]`).length > 0)
    assert.equal(new URL(metadata.alternates.canonical).pathname, url)
    assert.equal(metadata.description, guide.description.sr)
    assert.equal(maps.sitemapStaticPaths.filter(path => path === url).length, 1)
  }
  await assert.rejects(detail.default(props('missing-guide')), error => error.status === 404)
  await assert.rejects(detail.generateMetadata(props('missing-guide')), error => error.status === 404)
})

test('examples identify six strings and capo exercise matches independently transposed sounding chords', async () => {
  const { transposeChordSymbol } = require('../lib/chords/chordSymbols.ts')
  let $ = load(renderToStaticMarkup(await detail.default(props(guides.guitarGuides[0].slug))))
  assert.equal($('svg[role="img"]').length, 2)
  assert.equal($('svg[aria-label="Em: 0 2 2 0 0 0"]').length, 1)
  assert.equal($('svg[aria-label="Am: X 0 2 2 1 0"]').length, 1)
  for (const svg of $('svg').toArray()) assert.deepEqual($(svg).find('text').slice(-6).map((_, node) => $(node).text()).get(), ['6', '5', '4', '3', '2', '1'])
  $ = load(renderToStaticMarkup(await detail.default(props('capo-i-promena-tonaliteta'))))
  assert.equal($('table caption').length, 1)
  assert.equal($('thead th[scope="col"]').length, 3)
  for (const row of $('tbody tr').toArray()) {
    const cells = $(row).children().map((_, node) => $(node).text()).get()
    assert.equal(cells[1], cells[0])
    assert.equal(transposeChordSymbol(cells[0], 2), cells[2])
  }
})
