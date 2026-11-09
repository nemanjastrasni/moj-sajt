/* eslint-disable @typescript-eslint/no-require-imports -- Deterministic monitor and AI fixtures; no real API calls. */
const { test } = require('node:test'), assert = require('node:assert/strict')
const { inspectSite, publicPath, originUrl, robotsAllows, fetchText, samples, markdownReport, USER_AGENT } = require('./lib/site-monitor.cjs')
const { analyzeReport, validAnalysis, aiEligibility } = require('./lib/site-monitor-ai.cjs')
const { monitorOrigin } = require('./site-monitor.cjs')
test('monitor migrates known legacy settings to www while rejecting unsafe origins before normalization', () => {
  for (const value of ['https://moj-sajt-rho.vercel.app/', 'https://gitarakordi.com', 'https://www.gitarakordi.com']) assert.equal(monitorOrigin(value), 'https://www.gitarakordi.com')
  assert.equal(monitorOrigin('https://site.example'), 'https://site.example')
  for (const value of ['http://moj-sajt-rho.vercel.app', 'https://user:secret@www.gitarakordi.com', 'https://www.gitarakordi.com/path', 'https://www.gitarakordi.com/?secret=x', 'https://127.0.0.1']) assert.throws(() => monitorOrigin(value))
})
const origin = 'https://site.example', song = '/pesme/domace/bend/pesma', bio = '/biografija/domace/bend'
const xml = (tag, rows) => `<?xml version="1.0"?><${tag}>${rows.join('')}</${tag}>`
const map = paths => xml('urlset', paths.map(path => `<url><loc>${origin + path}</loc></url>`))
const index = xml('sitemapindex', ['pages.xml', 'songs-0.xml', 'artists-0.xml'].map(file => `<sitemap><loc>${origin}/sitemaps/${file}</loc></sitemap>`))
function html(path) {
  const schema = path === '/' ? 'WebSite' : 'BreadcrumbList'
  return `<title>Probna stranica</title><meta name="description" content="Probni opis"><link rel="canonical" href="${origin + path}"><h1>Pregled</h1><script type="application/ld+json">{"@context":"https://schema.org","@type":"${schema}"}</script>`
}
function siteFixture(overrides = {}) {
  const calls = [], pages = { '/robots.txt': `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${origin}/sitemap.xml`, '/sitemap.xml': index, '/sitemaps/pages.xml': map(['/']), '/sitemaps/songs-0.xml': map([song]), '/sitemaps/artists-0.xml': map([bio]), ...overrides }
  const fetcher = async (url, options) => {
    const parsed = new URL(url); assert.equal(parsed.origin, origin); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'manual')
    assert.equal(options.headers.Authorization, undefined); assert.match(options.headers['User-Agent'], /HeadlessChrome/)
    calls.push(parsed.pathname)
    const data = pages[parsed.pathname]
    if (data instanceof Response) return data.clone()
    return new Response(data ?? (parsed.pathname.startsWith('/api/admin/') ? '{}' : html(parsed.pathname)), { status: parsed.pathname.startsWith('/api/admin/') && data === undefined ? 401 : 200 })
  }
  return { fetcher, calls }
}
const warningReport = () => ({ formatVersion: 1, mode: 'observe-only', status: 'warning', databaseWrites: 0, sourceWrites: 0, startedAt: '2026-11-05T04:23:00Z', coverage: {}, checks: [{ id: 'check-1', level: 'warning', code: 'canonical', path: song, message: 'Canonical nedostaje.' }], ai: { status: 'not-requested' } })
const env = { OPENAI_API_KEY: 'test-key-never-print', GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'schedule', GITHUB_RUN_ATTEMPT: '1', GITHUB_REPOSITORY: 'owner/repo', GITHUB_RUN_ID: '42', GITHUB_RUN_NUMBER: '7' }
const now = new Date('2026-11-05T04:23:00Z')
const advice = { summary: 'Proveriti canonical.', findings: [{ checkId: 'check-1', explanation: 'Oznaka nedostaje.', recommendation: 'Pripremiti izmenu i testove za odobrenje.', requiresApproval: true }] }

test('production origins cannot target localhost, credentials, plaintext or URL paths', () => {
  assert.equal(originUrl(origin), origin)
  for (const value of ['http://site.example', 'https://127.0.0.1', 'https://localhost', 'https://host.internal', 'https://user:secret@site.example', origin + '/path', origin + '/?key=secret']) assert.throws(() => originUrl(value))
})
test('sitemap entries cannot turn into authenticated requests, foreign requests or private playlist probes', () => {
  assert.equal(publicPath(origin + song, origin), song)
  assert.equal(publicPath(origin + '/plejliste/lako', origin), '/plejliste/lako')
  assert.equal(publicPath(origin + '/public-listening-playlists', origin), '/public-listening-playlists')
  for (const path of ['/admin', '/api/admin/songs', '/profile', '/plejliste/private-user-id', '/plejliste/pesme-koje-znam', song + '?playlist=private', '/pesme/%ZZ']) assert.equal(publicPath(origin + path, origin), null)
  assert.equal(publicPath('https://foreign.example/pesme/x', origin), null)
  for (const path of ['/public-listening-playlists/private-id', '/public-listening-playlists?userId=private', '/listening-playlist/private-id']) assert.equal(publicPath(origin + path, origin), null)
})

test('the public listening catalog belongs in the sitemap without authorizing private lists', async () => {
  const fixture = siteFixture({ '/sitemaps/pages.xml': map(['/', '/public-listening-playlists']) })
  const result = await inspectSite({ origin, fetcher: fixture.fetcher, now })
  assert.equal(result.status, 'healthy')
  assert.equal(result.coverage.sitemapUrls, 4)
  assert.ok(fixture.calls.includes('/public-listening-playlists'))
  assert.equal(fixture.calls.some(path => path.startsWith('/listening-playlist')), false)
})
test('robots allow/disallow rules use specificity rather than treating Allow slash as a bypass', () => {
  const source = 'User-agent: special\nDisallow: /\nUser-agent: *\nAllow: /\nDisallow: /pesme/\nAllow: /pesme/domace/'
  assert.equal(robotsAllows(source, '/pesme/strane/bend'), false)
  assert.equal(robotsAllows(source, '/pesme/domace/bend'), true)
  assert.equal(robotsAllows('User-agent: *\nDisallow: /', '/'), false)
  assert.equal(robotsAllows('User-agent: *\nDisallow: /*?*', '/pesme?q=x'), false)
})
test('public checks scan every sitemap partition and render a bounded sample without any write method', async () => {
  const fixture = siteFixture(), result = await inspectSite({ origin, fetcher: fixture.fetcher, now })
  assert.equal(result.status, 'healthy'); assert.equal(result.databaseWrites, 0); assert.equal(result.sourceWrites, 0)
  assert.equal(result.coverage.sitemapFiles, 3); assert.equal(result.coverage.sitemapUrls, 3); assert.equal(result.coverage.songUrls, 1)
  assert.ok(fixture.calls.includes(song)); assert.ok(fixture.calls.includes(bio)); assert.ok(fixture.calls.includes('/api/admin/songs'))
  assert.doesNotMatch(JSON.stringify(result), /Probni opis|Probna stranica|test-key|<h1/)
  assert.ok(USER_AGENT.includes('HeadlessChrome'), 'existing popularity heuristic skips monitor reads')
})
test('missing canonical is a finding, whereas a public admin data response is critical', async () => {
  let fixture = siteFixture({ [song]: html(song).replace(/<link[^>]+>/, '') })
  let result = await inspectSite({ origin, fetcher: fixture.fetcher, now })
  assert.equal(result.status, 'warning'); assert.ok(result.checks.some(check => check.code === 'canonical' && check.path === song))
  assert.equal(result.checks.find(check=>check.code==='canonical').reason,'missing')
  fixture = siteFixture({ '/api/admin/songs': new Response('{}', { status: 200 }) })
  result = await inspectSite({ origin, fetcher: fixture.fetcher, now })
  assert.equal(result.status, 'critical'); assert.ok(result.checks.some(check => check.code === 'admin_access'))
  assert.equal(result.checks.find(check=>check.code==='admin_access').httpStatus,200)
})

test('daily HTML checks detect the root ISR header regression and publish a readable admin finding', async () => {
  const wrong = html('/') + '<div class="responsive-header" data-home="false"><a class="mobile-header-back" href="/">Nazad</a></div>'
  const fixture = siteFixture({ '/': wrong }), result = await inspectSite({ origin, fetcher: fixture.fetcher, now })
  assert.equal(result.status, 'warning')
  assert.equal(result.checks.find(check => check.code === 'home_navigation')?.path, '/')
  const {createPublishedReport,parsePublishedReport} = require('./lib/site-monitor-report.cjs')
  const published = createPublishedReport(result,{runId:'42',attempt:1})
  assert.equal(parsePublishedReport(published).checks.some(check => check.code === 'home_navigation'),true)
  assert.equal(result.databaseWrites,0); assert.equal(result.sourceWrites,0)
  const corrected = siteFixture({ '/': html('/') + '<div class="responsive-header" data-home="true"></div><script>self.__next_f=[];/* internal /index alias */</script>', [song]:html(song)+'<div class="responsive-header" data-home="false"></div>' })
  assert.equal((await inspectSite({origin,fetcher:corrected.fetcher,now})).status,'healthy')
})
test('foreign XML URLs are reported without being fetched and blocked song pages are not fetched', async () => {
  let fixture = siteFixture({ '/sitemap.xml': xml('sitemapindex', ['<sitemap><loc>https://evil.example/sitemaps/pages.xml</loc></sitemap>']) })
  let result = await inspectSite({ origin, fetcher: fixture.fetcher, now }); assert.equal(result.status, 'critical'); assert.ok(result.checks.some(check => check.code === 'sitemap_origin'))
  fixture = siteFixture({ '/robots.txt': `User-agent: *\nDisallow: /pesme\nSitemap: ${origin}/sitemap.xml` })
  result = await inspectSite({ origin, fetcher: fixture.fetcher, now }); assert.ok(result.checks.some(check => check.code === 'robots_blocks_public')); assert.equal(fixture.calls.includes(song), false)
})
test('timeouts and oversized bodies fail safely, while transient reads have a bounded retry', async () => {
  let calls = 0
  const success = await fetchText(origin, { fetcher: async () => ++calls === 1 ? new Response('', { status: 503 }) : new Response('ok') })
  assert.equal(success.text, 'ok'); assert.equal(calls, 2)
  calls = 0
  const timeout = await fetchText(origin, { fetcher: async () => { calls++; throw Error('private-secret') } })
  assert.equal(calls, 2); assert.equal(timeout.error, 'network-or-timeout'); assert.doesNotMatch(JSON.stringify(timeout), /secret/)
  const large = await fetchText(origin, { fetcher: async () => new Response('12345678'), maxBytes: 4 })
  assert.equal(large.error, 'body-limit')
})
test('rotating samples are deterministic, unique and remain bounded for small catalogs', () => {
  const urls = Array.from({ length: 100 }, (_, i) => String(i))
  assert.deepEqual(samples(urls, 12, '2026-11-05'), samples(urls, 12, '2026-11-05'))
  assert.notDeepEqual(samples(urls, 12, '2026-11-05'), samples(urls, 12, '2026-11-06'))
  assert.equal(new Set(samples(urls, 12, '2026-11-05')).size, 12); assert.deepEqual(samples([], 12, 'x'), []); assert.deepEqual(samples(['a'], 12, 'x'), ['a'])
})
test('healthy runs and runs without an AI key never call any external analysis service', async () => {
  const forbidden = async () => { throw Error('Unexpected network request') }
  assert.equal((await analyzeReport({ ...warningReport(), status: 'healthy' }, { fetcher: forbidden, env })).ai.status, 'not-needed')
  assert.equal((await analyzeReport(warningReport(), { fetcher: forbidden, env: {} })).ai.status, 'missing-key')
  for (const mode of ['push', 'pull_request', 'workflow_dispatch']) assert.equal(await aiEligibility({ ...env, GITHUB_EVENT_NAME: mode }, now, forbidden), 'scheduled-first-attempt-only')
  assert.equal(await aiEligibility({ ...env, GITHUB_RUN_ATTEMPT: '2' }, now, forbidden), 'scheduled-first-attempt-only')
})
test('a previous scheduled attempt consumes the daily AI allowance and API failure cannot bypass it', async () => {
  const used = async () => Response.json({ workflow_runs: [{ id: 41, run_number: 6, created_at: '2026-11-05T01:00:00Z' }] })
  assert.equal(await aiEligibility(env, now, used), 'daily-attempt-already-used')
  assert.equal(await aiEligibility(env, now, async () => new Response('', { status: 403 })), 'budget-check-unavailable')
})
test('AI receives only bounded check facts and returns advice without tools or execution privileges', async () => {
  let calls = 0
  const result = await analyzeReport({ ...warningReport(), lyrics: 'private song', databaseUrl: 'secret' }, { now, env, fetcher: async (url, options) => {
    if (url.startsWith('https://api.github.com/')) return Response.json({ workflow_runs: [] })
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(options.redirect, 'error')
    const body = JSON.parse(options.body)
    assert.equal(body.store, false); assert.equal(body.max_output_tokens, 1200); assert.equal(body.tools, undefined)
    assert.doesNotMatch(body.input, /private song|secret/)
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(advice) }] }], usage: { input_tokens: 250, output_tokens: 150 } })
  } })
  assert.equal(calls, 1); assert.equal(result.ai.status, 'advice-ready'); assert.equal(result.ai.executionAllowed, false); assert.equal(result.databaseWrites, 0)
})
test('model output cannot approve itself, invent a finding ID or turn a failed analysis into verified work', async () => {
  assert.equal(validAnalysis({ ...advice, execute: 'delete' }, ['check-1']), false)
  assert.equal(validAnalysis({ ...advice, findings: [{ ...advice.findings[0], requiresApproval: false }] }, ['check-1']), false)
  assert.equal(validAnalysis(advice, ['other']), false)
  const result = await analyzeReport(warningReport(), { now, env, fetcher: async url => url.startsWith('https://api.github.com/') ? Response.json({ workflow_runs: [] }) : Response.json({ status: 'incomplete', error: 'secret' }) })
  assert.equal(result.ai.status, 'incomplete-output'); assert.equal(result.status, 'warning'); assert.doesNotMatch(JSON.stringify(result), /secret/)
  await assert.rejects(analyzeReport({ ...warningReport(), databaseWrites: 1 }), /Invalid monitor/)
})
test('report markup escapes text and states its actual coverage and zero-write policy', () => {
  const report = warningReport(); report.coverage = { sitemapFiles: 3, sitemapUrls: 100, songUrls: 90, pagesChecked: 12 }; report.checks[0].path = '/pesme/<script>|test'
  const markdown = markdownReport(report)
  assert.ok(markdown.includes('bez potvrde Google indeksiranja')); assert.ok(markdown.includes('**0**')); assert.doesNotMatch(markdown, /\/pesme\/<script>/)
})

test('provider HTTP 429 remains explicit, costs no retry and never exposes provider body or credentials', async () => {
  let paidCalls = 0
  const result = await analyzeReport(warningReport(), { now, env, fetcher: async url => {
    if (url.startsWith('https://api.github.com/')) return Response.json({ workflow_runs: [] })
    paidCalls++
    return Response.json({ error: { message: 'private-provider-content' } }, { status: 429 })
  } })
  assert.equal(paidCalls, 1)
  assert.equal(result.status, 'warning')
  assert.equal(result.ai.status, 'provider-error')
  assert.equal(result.ai.httpStatus, 429)
  const markdown = markdownReport(result)
  assert.match(markdown, /HTTP 429/)
  assert.match(markdown, /ne potvrđuje/)
  assert.doesNotMatch(JSON.stringify(result) + markdown, /private-provider-content|test-key-never-print/)
})
