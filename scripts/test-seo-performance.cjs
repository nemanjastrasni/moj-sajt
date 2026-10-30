/* eslint-disable @typescript-eslint/no-require-imports -- Public SEO/cache fixtures, without live database writes. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } })
const { test, beforeEach, afterEach } = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path'), fs = require('node:fs'), sharp = require('sharp')
const root = path.join(__dirname, '..'), cacheStore = new Map(), requestCache = new Map(), definitions = []
let data, calls, jobs, down, functionId = 0
const prisma = {
  song: {
    findFirst: async query => { calls.push(['song', 'first', query]); if (down) throw Error('private-database-secret'); return query.where.slug === 'missing' ? null : data.song },
    count: async query => { calls.push(['song', 'count', query]); if (down) throw Error('private-database-secret'); return 1001 },
    findMany: async query => { calls.push(['song', 'many', query]); if (down) throw Error('private-database-secret'); return query.take === 5 ? [data.song] : data.sitemapSongs ?? [{ slug: 'pesma', artist: data.artist }] },
    update: async query => { calls.push(['song', 'update', query]); if (down) throw Error('private-database-secret'); return {} },
  },
  artist: {
    findFirst: async query => { calls.push(['artist', 'first', query]); if (down) throw Error('private-database-secret'); return query.where.slug === 'missing' ? null : data.artist },
    count: async query => { calls.push(['artist', 'count', query]); if (down) throw Error('private-database-secret'); return data.artists.length },
    findMany: async query => { calls.push(['artist', 'many', query]); if (down) throw Error('private-database-secret'); return data.artists },
  },
}
const original = Module._load
Module._load = function(request, parent, main) {
  if (request === "@/lib/playlists/server") return { playlistViewerId: async () => null }
  if (request === "@/lib/playlists/omiljene") return { omiljeneId: async () => null }
  if (request === '@/lib/prisma') return { prisma }
  if (request === 'next/cache') return {
    unstable_cache: (fn, keys, options) => {
      definitions.push({ keys, options })
      return (...args) => {
        const key = JSON.stringify([keys, args])
        if (!cacheStore.has(key)) cacheStore.set(key, Promise.resolve().then(() => fn(...args)).catch(error => { cacheStore.delete(key); throw error }))
        return cacheStore.get(key)
      }
    },
  }
  if (request === 'react') {
    const react = original.call(this, request, parent, main)
    return { ...react, cache: fn => { const id = functionId++; return (...args) => { const key = JSON.stringify([id, args]); if (!requestCache.has(key)) requestCache.set(key, fn(...args)); return requestCache.get(key) } } }
  }
  if (request === 'next/server') return { NextResponse: original.call(this, request, parent, main).NextResponse, after: fn => jobs.push(fn) }
  if (request === 'next/headers') return { headers: async () => new Headers({ 'user-agent': 'Mozilla browser' }) }
  if (request === 'next/navigation') return { notFound: () => { throw Object.assign(Error('not found'), { code: 'NEXT_NOT_FOUND' }) } }
  if (request === '@/lib/adminContent/server') return { artistContentVersion: () => 'version' }
  if (request === '@/lib/songReview/server') return { songReviewVersion: () => 'version' }
  if (request.includes('/components/') || request.endsWith('.css')) return { __esModule: true, default: () => null, BackNavigationTarget: () => null }
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  return original.call(this, request, parent, main)
}
let site, maps, songViews, home, homeModel, pages, routes, config
try {
  site = require('../lib/seo/site.ts'); maps = require('../lib/seo/sitemaps.ts'); songViews = require('../lib/songViews.ts'); home = require('../lib/homeSongsServer.ts'); homeModel = require('../lib/homeSongs.ts')
  pages = { song: require('../app/pesme/[category]/[artist]/[slug]/page.tsx'), artist: require('../app/pesme/[category]/[artist]/page.tsx'), bio: require('../app/biografija/[category]/[artist]/page.tsx') }
  routes = { index: require('../app/sitemap.xml/route.ts'), map: require('../app/sitemaps/[file]/route.ts'), popular: require('../app/api/popular/route.ts'), latest: require('../app/api/latest/route.ts'), robots: require('../app/robots.ts') }
  config = require('../next.config.ts').default
} finally { Module._load = original }
const warning = console.warn
beforeEach(() => {
  data = { artist: { id: 'artist', name: '\u017deljko Joksimovi\u0107', slug: 'zeljko', category: 'domace', image: null, bio: 'Probna biografija.', bioShort: null, discography: null, _count: { songs: 1, performances: 0 } } }
  data.song = { id: 'song', title: '\u010cuvena pesma', slug: 'pesma', lyrics: 'Am C\nProbni stih.', chords: null, category: 'stale-category', artist: data.artist, performers: [], privateField: 'must-not-leak' }
  data.artists = [data.artist, { ...data.artist, slug: 'empty', bio: null, _count: { songs: 0, performances: 0 } }, { ...data.artist, slug: 'discography', bio: null, discography: [{ title: 'Probni album', year: 2001 }], _count: { songs: 0, performances: 0 } }]
  calls = []; jobs = []; down = false; cacheStore.clear(); requestCache.clear()
})
afterEach(() => { console.warn = warning })
const props = (slug = 'pesma', extra = {}) => ({ params: Promise.resolve({ category: 'domace', artist: 'zeljko', slug }), searchParams: Promise.resolve(extra) })
const mapRequest = file => routes.map.GET(new Request('https://site.test/sitemaps/' + file), { params: Promise.resolve({ file }) })

test('site origin is stable across preview URLs and ready for one future owned domain setting', () => {
  assert.equal(site.resolveSiteOrigin({}), site.DEFAULT_SITE_URL)
  assert.equal(site.resolveSiteOrigin({ VERCEL_URL: 'temporary-preview.vercel.app' }), site.DEFAULT_SITE_URL)
  assert.equal(site.resolveSiteOrigin({ SITE_URL: 'https://owned.example/', VERCEL_PROJECT_PRODUCTION_URL: 'production.vercel.app' }), 'https://owned.example')
  assert.equal(site.resolveSiteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'production.vercel.app' }), 'https://production.vercel.app')
  for (const SITE_URL of ['http://owned.example', 'https://user:pass@owned.example', 'https://owned.example/path', 'https://owned.example/?x=1', 'https://owned.example/#x', 'https://owned.example:444']) assert.throws(() => site.resolveSiteOrigin({ SITE_URL }))
})
test('canonical paths encode route segments and remove private navigation query strings', () => {
  assert.equal(site.routePath('pesme', 'domace', '\u017deljko', 'pesma #1'), '/pesme/domace/%C5%BDeljko/pesma%20%231')
  assert.equal(site.publicUrl('/pesme/a/b/c?playlist=private#notes'), site.SITE_URL + '/pesme/a/b/c')
  for (const value of ['//evil.example', 'https://evil.example', '/\\evil.example']) assert.throws(() => site.publicUrl(value))
  assert.throws(() => site.routePath('pesme', '..'))
})
test('song metadata uses the real title/diacritics and one canonical for all personal contexts', async () => {
  const actual = await pages.song.generateMetadata(props('pesma', { playlist: '/plejliste/private', from: 'favorites' }))
  assert.equal(actual.title, '\u010cuvena pesma \u2013 \u017deljko Joksimovi\u0107: akordi i tekst')
  assert.equal(actual.alternates.canonical, site.SITE_URL + '/pesme/domace/zeljko/pesma')
  assert.equal(actual.openGraph.url, actual.alternates.canonical)
  assert.equal(actual.twitter.card, 'summary_large_image')
  assert.equal(jobs.length, 0)
})
test('metadata and song rendering share a request read; view counting is deferred', async () => {
  await pages.song.generateMetadata(props()); await pages.song.default(props())
  assert.equal(calls.filter(call => call[0] === 'song' && call[1] === 'first').length, 1)
  assert.equal(calls.filter(call => call[1] === 'update').length, 0); assert.equal(jobs.length, 1)
  await jobs[0](); assert.equal(calls.filter(call => call[1] === 'update').length, 1)
  assert.deepEqual(calls.find(call => call[1] === 'update')[2], { where: { id: 'song' }, data: { popularity: { increment: 1 } } })
})
test('unknown songs and categories are 404s, not plausible-looking SEO pages', async () => {
  await assert.rejects(pages.song.generateMetadata(props('missing')), error => error.code === 'NEXT_NOT_FOUND')
  await assert.rejects(pages.song.generateMetadata({ params: Promise.resolve({ category: 'invalid', artist: 'zeljko', slug: 'pesma' }) }), error => error.code === 'NEXT_NOT_FOUND')
  assert.equal(calls.filter(call => call[1] === 'first').length, 1)
})
test('artist and biography pages use descriptive canonical metadata without indexing empty biographies', async () => {
  const artist = await pages.artist.generateMetadata(props()), bio = await pages.bio.generateMetadata(props())
  assert.equal(artist.alternates.canonical, site.SITE_URL + '/pesme/domace/zeljko')
  assert.equal(bio.alternates.canonical, site.SITE_URL + '/biografija/domace/zeljko')
  assert.equal(calls.filter(call => call[0] === 'artist' && call[1] === 'first').length, 1)
  data.artist.bio = ''; const empty = await pages.bio.generateMetadata(props())
  assert.deepEqual(empty.robots, { index: false, follow: true })
})
test('prefetches and known crawlers do not inflate song popularity', () => {
  for (const values of [{ 'next-router-prefetch': '1' }, { 'x-middleware-prefetch': '1' }, { purpose: 'prefetch' }, { 'sec-purpose': 'prefetch;prerender' }, { 'user-agent': 'Googlebot' }, { 'user-agent': 'HeadlessChrome' }, { 'user-agent': 'facebookexternalhit' }]) {
    assert.equal(songViews.shouldCountSongView(new Headers(values)), false)
    songViews.countSongViewAfterResponse('song', new Headers(values))
  }
  assert.equal(jobs.length, 0); assert.equal(songViews.shouldCountSongView(new Headers({ 'user-agent': 'Mozilla Chrome Safari' })), true)
})
test('a failed deferred view count never fails the already-rendered song or logs credentials', async () => {
  const warnings = []; console.warn = message => warnings.push(message)
  songViews.countSongViewAfterResponse('song', new Headers()); down = true
  await assert.doesNotReject(jobs[0]()); assert.equal(warnings.length, 1); assert.doesNotMatch(warnings.join(''), /private|secret/)
})
test('sitemap index partitions large catalogs instead of silently truncating them', async () => {
  assert.deepEqual(maps.sitemapFiles(1001, 1), ['pages.xml', 'songs-0.xml', 'songs-1.xml', 'artists-0.xml'])
  assert.deepEqual(maps.sitemapFiles(0, 0), ['pages.xml'])
  for (const count of [-1, NaN, Infinity, 1.5, 10000001]) assert.throws(() => maps.sitemapFiles(count, 0))
  const response = await routes.index.GET(), text = await response.text()
  assert.equal(response.status, 200); assert.match(text, /<sitemapindex/); assert.match(text, /songs-1\.xml/)
  assert.ok(response.headers.get('content-type').startsWith('application/xml'))
})
test('song sitemap batches are bounded, stable and contain only canonical public URLs', async () => {
  const response = await mapRequest('songs-1.xml'), text = await response.text()
  assert.match(text, /<urlset/); assert.match(text, /\/pesme\/domace\/zeljko\/pesma/)
  assert.doesNotMatch(text, /private|playlist=|lyrics|lastmod/)
  const query = calls.find(call => call[0] === 'song' && call[1] === 'many')[2]
  assert.equal(query.take, maps.SITEMAP_BATCH_SIZE); assert.equal(query.skip, maps.SITEMAP_BATCH_SIZE); assert.deepEqual(query.orderBy, { id: 'asc' })
  assert.deepEqual(Object.keys(query.select).sort(), ['artist', 'slug'])
})
test('artist maps omit empty profiles and include biographies only when content exists', async () => {
  const text = await (await mapRequest('artists-0.xml')).text()
  assert.match(text, /\/pesme\/domace\/zeljko/); assert.match(text, /\/biografija\/domace\/zeljko/)
  assert.match(text, /\/biografija\/domace\/discography/); assert.doesNotMatch(text, /\/empty|\/pesme\/domace\/discography/)
})
test('malformed legacy slugs are skipped without dropping a whole sitemap batch', async () => {
  data.sitemapSongs = ['', ' ', '.', '..', 'pesma'].map(slug => ({ slug, artist: data.artist }))
  const response = await mapRequest('songs-0.xml'), text = await response.text()
  assert.equal(response.status, 200); assert.equal((text.match(/<url>/g) || []).length, 1)
  assert.match(text, /\/pesme\/domace\/zeljko\/pesma/)
  assert.ok(definitions.some(definition => definition.keys[0] === 'seo-sitemap-pages-v1' && definition.keys.includes(site.SITE_URL)))
})
test('static sitemap excludes personal/admin screens and safely serializes XML', async () => {
  const text = await (await mapRequest('pages.xml')).text()
  assert.match(text, /\/o-nama/); assert.doesNotMatch(text, /\/admin|\/profile|\/favorite|\/login|listening-playlist/)
  assert.equal(calls.length, 0)
  const xml = maps.xmlUrlset(['https://site.test/?a=1&b=<script>', 'https://site.test/?a=1&b=<script>'])
  assert.match(xml, /&amp;/); assert.doesNotMatch(xml, /<script>/); assert.equal((xml.match(/<url>/g) || []).length, 1)
})
test('invalid/out-of-range sitemap pages never issue large offset data queries', async () => {
  for (const file of ['songs--1.xml', 'songs-01.xml', 'songs-999999999.xml', 'private-0.xml', 'songs-2.xml', 'artists-1.xml']) assert.equal((await mapRequest(file)).status, 404)
  assert.equal(calls.filter(call => call[1] === 'many').length, 0)
})
test('sitemap database failures return retryable 503, never an empty successful catalog', async () => {
  down = true
  for (const response of [await routes.index.GET(), await mapRequest('songs-0.xml')]) {
    assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('retry-after'), '60')
    assert.doesNotMatch(await response.text(), /private|secret/)
  }
})
test('public lists cache by kind and serialize only whitelisted song metadata', async () => {
  const response = await routes.popular.GET(), songs = await response.json()
  assert.equal(response.status, 200); assert.equal(homeModel.isHomeSongList(songs), true)
  assert.equal(songs[0].category, 'domace'); assert.doesNotMatch(JSON.stringify(songs), /lyrics|bio|discography|privateField|must-not-leak|_count/)
  await routes.popular.GET(); assert.equal(calls.filter(call => call[1] === 'many').length, 1)
  await routes.latest.GET(); assert.equal(calls.filter(call => call[1] === 'many').length, 2)
  const queries = calls.filter(call => call[1] === 'many').map(call => call[2])
  assert.equal(queries[0].take, 5); assert.deepEqual(queries[1].orderBy[0], { createdAt: { sort: 'desc', nulls: 'last' } })
  assert.match(response.headers.get('cache-control'), /s-maxage=60/)
  assert.ok(definitions.every(definition => definition.options.revalidate <= 300))
})
test('public list outages remain retryable and a failed request does not poison the cache', async () => {
  down = true; const failed = await home.homeSongsResponse('popular')
  assert.equal(failed.status, 503); assert.equal(failed.headers.get('cache-control'), 'no-store'); assert.doesNotMatch(await failed.text(), /secret/)
  down = false; assert.equal((await home.homeSongsResponse('popular')).status, 200)
  for (const value of [null, {}, [{ id: 'bad' }], Array(6).fill({}), [{ ...data.song, artist: null }]]) assert.equal(homeModel.isHomeSongList(value), false)
})
test('robots advertises the sitemap while public JSON can render and private screens remain excluded', () => {
  const result = routes.robots.default()
  assert.equal(result.sitemap, site.SITE_URL + '/sitemap.xml')
  assert.ok(result.rules[0].allow.includes('/api/popular')); assert.ok(result.rules[0].allow.includes('/api/latest'))
  for (const route of ['/admin', '/profile', '/favorite', '/login']) assert.ok(result.rules[0].disallow.includes(route))
})
test('immutable image caching is restricted to the content-hashed derivative directory', async () => {
  const headers = await config.headers(), image = headers.find(rule => rule.source.startsWith('/images/optimized'))
  assert.match(image.headers[0].value, /31536000.*immutable/)
  assert.ok(headers.find(rule => rule.source === '/api/:path*').headers.some(header => header.key === 'X-Robots-Tag'))
  assert.equal(headers.some(rule => rule.source === '/:path*'), false)
})
test('responsive derivatives exist, retain aspect ratio, and meet the mobile first-image budget', async () => {
  const images = require('../lib/site-image-manifest.json')
  assert.equal(Object.keys(images).length, 8)
  for (const image of Object.values(images)) {
    assert.equal(fs.statSync(path.join(root, 'public', image.source)).size, image.sourceBytes)
    for (const variant of image.variants) {
      assert.match(variant.src, /^\/images\/optimized\/[A-Za-z]+-\d+-[a-f0-9]{12}\.webp$/)
      const file = path.join(root, 'public', variant.src), actual = await sharp(file).metadata()
      assert.equal(actual.format, 'webp'); assert.equal(actual.width, variant.width); assert.equal(actual.height, variant.height)
      assert.equal(fs.statSync(file).size, variant.bytes); assert.ok(variant.bytes < image.sourceBytes)
    }
    assert.match(image.srcSet, /640w|480w/)
  }
  assert.ok(images.heroStrane.variants[0].bytes < 40000)
})
