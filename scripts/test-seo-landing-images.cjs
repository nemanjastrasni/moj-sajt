/* eslint-disable @typescript-eslint/no-require-imports -- Public HTML and local image checks, without network or database access. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } })
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs/promises'), path = require('node:path'), Module = require('node:module'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server'), { load } = require('cheerio'), sharp = require('sharp')
const root = path.resolve(__dirname, '..'), original = Module._load
Module._load = function(request, parent, main) {
  if (request.endsWith('.css')) return {}
  if (request === '@/app/components/UiText') return { __esModule: true, default: ({ text }) => text }
  if (request === 'next/link') return { __esModule: true, default: props => { const link = { ...props }; delete link.prefetch; return React.createElement('a', link) } }
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  return original.call(this, request, parent, main)
}
let songs, chords, SiteImage
try { songs = require('../app/pesme/page.tsx'); chords = require('../app/akordi/page.tsx'); SiteImage = require('../app/components/SiteImage.tsx').default } finally { Module._load = original }
const manifest = require('../lib/site-image-manifest.json')

test('song and chord entry pages contain useful HTML with links to the existing practice catalogs', () => {
  for (const page of [songs, chords]) {
    const $ = load(renderToStaticMarkup(React.createElement(page.default)))
    assert.equal($('h1').length, 1)
    assert.ok($('p').text().length > 300)
    assert.ok($('a[href="/plejliste/beginner"]').length)
    assert.ok($('a[href="/plejliste/acoustic"]').length)
    assert.equal($('[hidden],.sr-only').length, 0, 'explanations are visible content')
    assert.equal($('script[type="application/ld+json"]').length, 0, 'no invented FAQ eligibility or ratings')
  }
  const $ = load(renderToStaticMarkup(React.createElement(songs.default)))
  assert.match($('h1').text(), /Pesme sa akordima za gitaru/)
  for (const category of ['domace', 'narodne', 'strane']) assert.ok($(`a[href="/pesme/${category}"]`).length)
  assert.ok($('a[href="/plejliste/4-akorda"]').length)
})

test('AVIF sources retain one lazy responsive WebP fallback and do not touch the priority hero', () => {
  const $ = load(renderToStaticMarkup(React.createElement(SiteImage, { name: 'categoryNarodne', sizes: '400px', alt: 'Kategorija' })))
  assert.equal($('source[type="image/avif"]').attr('sizes'), '400px')
  assert.equal($('img').length, 1)
  assert.equal($('img').attr('srcset'), manifest.categoryNarodne.srcSet)
  assert.equal($('img').attr('loading'), 'lazy')
  assert.equal($('img').attr('alt'), 'Kategorija')
  const hero = load(renderToStaticMarkup(React.createElement(SiteImage, { name: 'heroStrane', priority: true })))
  assert.equal(hero('picture,source').length, 0)
  assert.equal(hero('img').attr('fetchpriority'), 'high')
  assert.equal(hero('img').attr('loading'), 'eager')
})

test('every enabled AVIF width is a real, smaller image with exactly the fallback dimensions', async () => {
  const names = Object.keys(manifest).filter(name => manifest[name].avifVariants)
  assert.deepEqual(names.sort(), ['categoryDomace', 'categoryNarodne', 'categoryStrane', 'latestBackground', 'popularBackground'])
  for (const name of names) {
    const image = manifest[name]
    assert.equal(image.avifVariants.length, image.variants.length)
    for (const [i, variant] of image.avifVariants.entries()) {
      const bytes = await fs.readFile(path.join(root, 'public', variant.src)), info = await sharp(bytes).metadata(), fallback = image.variants[i]
      assert.equal(info.format, 'heif')
      assert.equal(info.width, fallback.width)
      assert.equal(info.height, fallback.height)
      assert.equal(bytes.length, variant.bytes)
      assert.ok(bytes.length < fallback.bytes)
    }
  }
})
