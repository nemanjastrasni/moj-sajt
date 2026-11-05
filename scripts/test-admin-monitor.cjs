/* eslint-disable @typescript-eslint/no-require-imports -- Admin authorization and public metadata fixtures. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } })
const { test, beforeEach, afterEach } = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path')
const { renderToStaticMarkup } = require('react-dom/server')
let allowed, authCalls, stored
const original = Module._load, realFetch = global.fetch
Module._load = function(request, parent, main) {
  if (request === '@/lib/adminSongs/server') return { requireSongAdmin: async () => { authCalls++; if (!allowed) throw Error('forbidden') } }
  if (request === 'next/cache') return { unstable_cache: work => async () => stored || (stored = await work()) }
  if (request.startsWith('@/')) request = path.join(__dirname, '..', request.slice(2))
  return original.call(this, request, parent, main)
}
let service, Page
try { service = require('../lib/monitoring/server.ts'); Page = require('../app/admin/nadzor/page.tsx').default } finally { Module._load = original }
const now = new Date('2026-11-05T12:00:00Z')
const run = (overrides = {}) => ({ id: 100, event: 'schedule', status: 'completed', conclusion: 'success', created_at: '2026-11-05T04:23:00Z', head_branch: 'main', ...overrides })
beforeEach(() => { allowed = true; authCalls = 0; stored = null; global.fetch = async () => Response.json({ workflow_runs: [run()] }) })
afterEach(() => { global.fetch = realFetch })

test('every history request requires admin authorization, including a cached history', async () => {
  assert.equal((await service.readMonitorHistory()).state, 'ready')
  allowed = false
  await assert.rejects(service.readMonitorHistory(), /forbidden/)
  assert.equal(authCalls, 2)
})
test('only bounded main-branch workflow metadata is retained and external links cannot be injected', async () => {
  const history = await service.fetchMonitorHistory(async (url, options) => {
    assert.ok(url.startsWith('https://api.github.com/repos/nemanjastrasni/moj-sajt/'))
    assert.equal(options.headers.Authorization, undefined); assert.equal(options.redirect, 'error')
    return Response.json({ workflow_runs: [run({ html_url: 'https://evil.example/', secret: 'hidden' }), run({ id: 101, event: 'pull_request' }), run({ id: 102, head_branch: 'other' })] })
  }, now)
  assert.equal(history.runs.length, 1); assert.equal(history.runs[0].url, 'https://github.com/nemanjastrasni/moj-sajt/actions/runs/100')
  assert.doesNotMatch(JSON.stringify(history), /secret|hidden|evil/)
})
test('missing workflows, rate limits, network failure and malformed responses are explicit unavailable states', async () => {
  assert.equal((await service.fetchMonitorHistory(async () => new Response('', { status: 404 }), now)).state, 'not-configured')
  for (const fetcher of [async () => new Response('', { status: 403 }), async () => { throw Error('private error') }, async () => Response.json({ wrong: [] }), async () => Response.json({ workflow_runs: [run({ created_at: 'bad' })] })]) {
    const history = await service.fetchMonitorHistory(fetcher, now)
    assert.equal(history.state, 'unavailable'); assert.equal(history.runs.length, 0); assert.doesNotMatch(JSON.stringify(history), /private error/)
  }
})
test('a recent manual check cannot hide an overdue scheduled check or an unfinished daily run', () => {
  const base = { state: 'ready', checkedAt: now.toISOString(), runs: [] }
  assert.match(service.monitorScheduleNotice(base), /Nema zabeleženih/)
  const entry = { event: 'schedule', startedAt: '2026-11-02T04:23:00Z', status: 'completed', conclusion: 'success' }
  assert.match(service.monitorScheduleNotice({ ...base, runs: [{ ...entry, event: 'workflow_dispatch', startedAt: now.toISOString() }, entry] }), /duže od 36 sati/)
  assert.match(service.monitorScheduleNotice({ ...base, runs: [{ ...entry, startedAt: now.toISOString(), status: 'in_progress' }] }), /nije završena/)
  assert.match(service.monitorScheduleNotice({ ...base, runs: [{ ...entry, startedAt: now.toISOString(), conclusion: 'failure' }] }), /nije uspešno/)
  assert.match(service.monitorScheduleNotice({ ...base, runs: [{ ...entry, startedAt: now.toISOString() }] }), /zeleno pokretanje ne znači/)
})
test('admin page explains actual AI status, limited retention, sample coverage and approval boundary', async () => {
  const html = renderToStaticMarkup(await Page())
  for (const value of ['Nadzor sajta', '30 dana', 'Bez API ključa', 'nema automatskih upisa', 'tvoju proveru i odobrenje', 'zeleno', 'Google indeksiranje']) assert.ok(html.includes(value), value)
  assert.doesNotMatch(html, /<form|OPENAI_API_KEY|api\.openai/)
})
