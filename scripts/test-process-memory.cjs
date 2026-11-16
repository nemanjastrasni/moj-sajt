/* eslint-disable @typescript-eslint/no-require-imports -- Isolated auth and Node process fixtures; no database connection. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } })
const { test, beforeEach } = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
let session, user, dbFailure, dbReads, measurements, peakUnavailable
const memory = { rss: 104857600, heapTotal: 52428800, heapUsed: 26214400, external: 10485760, arrayBuffers: 5242880, secret: 'do-not-expose' }
const fakeProcess = {
  memoryUsage() { measurements++; return memory },
  resourceUsage() { if (peakUnavailable) throw Error('unavailable'); return { maxRSS: 122880 } },
  uptime: () => 3661,
}
const original = Module._load
Module._load = function(request, parent, main) {
  if (request === 'node:process' && parent.filename.endsWith('process-memory-server.ts')) return fakeProcess
  if (request === 'next-auth') return { getServerSession: async () => session }
  if (request === '@/lib/auth') return { authOptions: {} }
  if (request === '@/lib/prisma') return { prisma: { user: { findUnique: async args => {
    dbReads++; assert.deepEqual(args.select, { id: true, banned: true, role: true })
    if (dbFailure) throw Error('postgres://private-host/password')
    return user
  } } } }
  if (request.endsWith('.module.css')) return { __esModule: true, default: {} }
  if (request.startsWith('@/')) request = path.join(__dirname, '..', request.slice(2))
  return original.call(this, request, parent, main)
}
let route, model, collector, Panel
try {
  route = require('../app/api/admin/process-memory/route.ts')
  model = require('../lib/monitoring/process-memory-model.ts')
  collector = require('../lib/monitoring/process-memory-server.ts')
  Panel = require('../app/admin/nadzor/ProcessMemory.tsx').default
} finally { Module._load = original }
beforeEach(() => {
  session = { user: { id: 'admin-1', role: 'admin' } }
  user = { id: 'admin-1', role: 'admin', banned: false }
  dbFailure = false; peakUnavailable = false; dbReads = 0; measurements = 0
})
function privateResponse(response) {
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(response.headers.get('vary'), 'Cookie')
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow')
}
test('anonymous requests never sample the process and are not cached', async () => {
  session = null
  const result = await route.GET()
  assert.equal(result.status, 401); privateResponse(result)
  assert.equal(measurements, 0); assert.equal(dbReads, 0)
})
test('regular, banned and deleted users are rejected even with an admin JWT', async () => {
  for (const denied of [{ ...user, role: 'user' }, { ...user, banned: true }, null]) {
    user = denied
    const result = await route.GET()
    assert.equal(result.status, 403); privateResponse(result)
  }
  assert.equal(measurements, 0); assert.equal(dbReads, 3)
})
test('authorization is rechecked after role revocation; a previous success cannot bypass it', async () => {
  assert.equal((await route.GET()).status, 200)
  user.role = 'user'
  assert.equal((await route.GET()).status, 403)
  assert.equal(dbReads, 2); assert.equal(measurements, 1)
})
test('database failures are private generic errors and never trigger sampling', async () => {
  dbFailure = true
  const result = await route.GET()
  assert.equal(result.status, 503); privateResponse(result)
  assert.doesNotMatch(await result.text(), /postgres|password|private-host/)
  assert.equal(measurements, 0)
})
test('admin response has explicit units, stable process identity and only whitelisted fields', async () => {
  const result = await route.GET(), sample = await result.json()
  assert.equal(result.status, 200); privateResponse(result)
  assert.equal(route.runtime, 'nodejs'); assert.equal(route.dynamic, 'force-dynamic')
  assert.equal(model.isProcessMemorySnapshot(sample), true)
  assert.equal(sample.rssBytes, memory.rss); assert.equal(sample.peakRssBytes, 120 * 1024 * 1024)
  assert.equal(sample.externalBytes, 10 * 1024 * 1024); assert.equal(sample.arrayBuffersBytes, 5 * 1024 * 1024)
  assert.deepEqual(Object.keys(sample).sort(), ['measuredAt','instanceId','uptimeSeconds','rssBytes','heapUsedBytes','heapTotalBytes','externalBytes','arrayBuffersBytes','peakRssBytes'].sort())
  assert.equal(collector.measureProcessMemory().instanceId, sample.instanceId)
  assert.doesNotMatch(JSON.stringify(sample), /do-not-expose|env|argv|password|pid/)
  assert.equal(model.memoryMiB(sample.rssBytes), '100 MiB'); assert.equal(model.processDuration(sample.uptimeSeconds), '1 h 1 min')
})
test('unsupported peak measurement stays unavailable instead of falsely becoming zero', () => {
  peakUnavailable = true
  const sample = collector.measureProcessMemory()
  assert.equal(sample.peakRssBytes, null); assert.ok(model.isProcessMemorySnapshot(sample))
})
test('malformed responses cannot render NaN, infinity, negative memory or invalid timestamps', () => {
  const sample = collector.measureProcessMemory()
  for (const invalid of [null, [], {}, { ...sample, rssBytes: -1 }, { ...sample, externalBytes: Infinity }, { ...sample, uptimeSeconds: NaN }, { ...sample, measuredAt: 'bad' }, { ...sample, instanceId: 'bad' }, { ...sample, heapTotalBytes: 0 }, { ...sample, peakRssBytes: -1 }]) assert.equal(model.isProcessMemorySnapshot(invalid), false)
})
test('initial panel has no misleading zero values and explains process scope without fetching', () => {
  const html = renderToStaticMarkup(React.createElement(Panel))
  for (const text of ['Memorija procesa', 'Prikaži memoriju', 'a ne ukupna memorija Render instance', 'nema stalnog praćenja', 'Ove vrednosti se ne sabiraju']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /0 MiB|512 MB|0%/)
  assert.equal(measurements, 0)
})
