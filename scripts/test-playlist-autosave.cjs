/* eslint-disable @typescript-eslint/no-require-imports -- Isolated playlist autosave sessions. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } })
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createPlayingSettingsSession } = require('../lib/playlists/settingsSession.ts')

const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function fixture({ editable = true, transpose = 0, capo = null, playlistId = 'list', songId = 'song', read, write } = {}) {
  let stored = { entryId: `${playlistId}-${songId}`, version: 0, transpose, capo }, publications = 0
  const writes = [], reads = []
  const response = () => ({ playlistId, songId, editable, setting: { ...stored } })
  const session = createPlayingSettingsSession(async (input, signal) => {
    if (!input) { reads.push(signal); if (read) await read(signal); return response() }
    writes.push({ ...input })
    if (write) await write(input, signal)
    assert.equal(input.entryId, stored.entryId)
    assert.equal(input.version, stored.version)
    stored = { ...input, version: input.version + 1 }
    return response()
  }, () => { publications++ })
  return { session, writes, reads, stored: () => ({ ...stored }), publications: () => publications }
}

test('restores saved values without writing or changing original defaults', async () => {
  const f = fixture({ transpose: -2, capo: 4 })
  await f.session.load()
  assert.deepEqual(f.session.snapshot(), { transpose: -2, capo: 4, phase: 'ready', editable: true, error: '', saved: f.stored(), pending: false })
  assert.equal(f.reads.length, 1); assert.equal(f.writes.length, 0)
})

test('changing the key starts autosave without a save button or explicit flush', async () => {
  const f = fixture(); await f.session.load()
  f.session.change({ transpose: 1, capo: null })
  assert.equal(f.session.snapshot().pending, true)
  assert.equal(f.session.snapshot().phase, 'saving')
  await tick()
  assert.deepEqual(f.writes, [{ entryId: 'list-song', version: 0, transpose: 1, capo: null }])
  assert.equal(f.session.snapshot().phase, 'saved'); assert.equal(f.session.snapshot().pending, false)
})

test('a burst of key and capo changes before sending writes only the final arrangement', async () => {
  const f = fixture(); await f.session.load()
  f.session.change({ transpose: 1, capo: null })
  f.session.change({ transpose: 2, capo: 3 })
  f.session.change({ transpose: 3, capo: 5 })
  assert.equal(await f.session.flush(), true)
  assert.deepEqual(f.writes, [{ entryId: 'list-song', version: 0, transpose: 3, capo: 5 }])
})

test('no-op changes and a reverted unsent burst do not create database versions', async () => {
  const f = fixture(); await f.session.load()
  f.session.change({ transpose: 0, capo: null }); await tick()
  assert.equal(f.writes.length, 0)
  f.session.change({ transpose: 1, capo: null })
  f.session.change({ transpose: 0, capo: null })
  await f.session.flush()
  assert.equal(f.writes.length, 0); assert.equal(f.session.snapshot().pending, false)
})

test('in-flight changes serialize with acknowledged versions and never overwrite the newer preview', async () => {
  const first = deferred(), second = deferred()
  const f = fixture({ write: input => input.version === 0 ? first.promise : second.promise })
  await f.session.load(); f.session.change({ transpose: 1, capo: 2 }); await tick()
  f.session.change({ transpose: 2, capo: 3 })
  f.session.change({ transpose: 4, capo: 5 })
  assert.equal(f.writes.length, 1)
  const draining = f.session.flush()
  first.resolve(); await tick()
  assert.deepEqual(f.writes[1], { entryId: 'list-song', version: 1, transpose: 4, capo: 5 })
  assert.equal(f.session.snapshot().transpose, 4); assert.equal(f.session.snapshot().capo, 5)
  assert.equal(f.session.snapshot().saved.transpose, 1); assert.equal(f.session.snapshot().pending, true)
  let finished = false
  void draining.then(() => { finished = true })
  await tick(); assert.equal(finished, false)
  second.resolve(); assert.equal(await draining, true)
  assert.equal(f.session.snapshot().saved.version, 2); assert.equal(f.session.snapshot().pending, false)
})

test('returning to the original key during an in-flight save remains pending and persists the reset', async () => {
  const gate = deferred()
  const f = fixture({ write: input => input.version === 0 ? gate.promise : undefined })
  await f.session.load(); f.session.change({ transpose: 2, capo: null }); await tick()
  f.session.change({ transpose: 0, capo: null })
  assert.equal(f.session.snapshot().pending, true)
  gate.resolve(); assert.equal(await f.session.flush(), true)
  assert.deepEqual(f.writes.map(row => [row.version, row.transpose]), [[0, 2], [1, 0]])
  assert.equal(f.stored().transpose, 0)
})

test('source capo and physical fret zero remain distinct saved values', async () => {
  const f = fixture(); await f.session.load()
  f.session.change({ transpose: 0, capo: 0 }); await f.session.flush()
  f.session.change({ transpose: 0, capo: null }); await f.session.flush()
  assert.deepEqual(f.writes.map(row => row.capo), [0, null])
})

test('non-owners can preview but never write, become dirty or block navigation', async () => {
  const f = fixture({ editable: false }); await f.session.load()
  f.session.change({ transpose: 4, capo: 5 }); await tick()
  assert.equal(f.session.snapshot().transpose, 4); assert.equal(f.session.snapshot().pending, false)
  assert.equal(await f.session.flush(), true); assert.equal(f.writes.length, 0)
})

test('separate playlist and song sessions do not share their arrangements or versions', async () => {
  const a = fixture(), b = fixture({ playlistId: 'other', transpose: -3 }), c = fixture({ songId: 'next', capo: 4 })
  await Promise.all([a.session.load(), b.session.load(), c.session.load()])
  a.session.change({ transpose: 2, capo: 3 }); await a.session.flush()
  assert.equal(b.session.snapshot().transpose, -3); assert.equal(c.session.snapshot().capo, 4)
  assert.equal(b.writes.length + c.writes.length, 0)
})

test('conflicts preserve the preview and never blindly retry or overwrite another session', async () => {
  const f = fixture({ write: () => { throw Error('Podesavanja su izmenjena na drugom mestu. Ucitaj sacuvanu verziju.') } })
  await f.session.load(); f.session.change({ transpose: 4, capo: 2 })
  assert.equal(await f.session.flush(), false)
  assert.equal(f.session.snapshot().transpose, 4); assert.equal(f.session.snapshot().capo, 2)
  assert.equal(f.session.snapshot().phase, 'error'); assert.equal(f.session.snapshot().pending, true)
  f.session.change({ transpose: 5, capo: 5 }); assert.equal(await f.session.flush(), false)
  assert.equal(f.writes.length, 1); assert.equal(f.session.snapshot().transpose, 4)
  assert.equal(f.stored().version, 0)
})

test('an uncertain save still warns when the user returned to the previously saved values', async () => {
  const gate = deferred(), f = fixture({ write: () => gate.promise })
  await f.session.load(); f.session.change({ transpose: 3, capo: null }); await tick()
  f.session.change({ transpose: 0, capo: null })
  gate.reject(Error('Zahtev traje predugo. Podesavanja mozda jesu sacuvana; ucitaj sacuvanu verziju.'))
  assert.equal(await f.session.flush(), false)
  assert.equal(f.session.snapshot().pending, true); assert.equal(f.session.snapshot().transpose, 0)
  assert.equal(f.writes.length, 1)
})

test('load failures do not enable writes or invent a successful save', async () => {
  const f = fixture({ read: () => { throw Error('offline') } })
  await f.session.load(); f.session.change({ transpose: 1, capo: 2 })
  assert.equal(f.session.snapshot().phase, 'error'); assert.equal(f.session.snapshot().saved, null)
  assert.equal(f.session.snapshot().pending, false); assert.equal(f.writes.length, 0)
})

test('settings cannot change before loading and invalid values never become requests', async () => {
  const gate = deferred(), f = fixture({ read: () => gate.promise })
  const loading = f.session.load(); f.session.change({ transpose: 3, capo: 4 })
  assert.equal(f.session.snapshot().transpose, 0)
  gate.resolve(); await loading
  for (const values of [{ transpose: 12, capo: null }, { transpose: 1.5, capo: 0 }, { transpose: 0, capo: 13 }]) assert.throws(() => f.session.change(values))
  assert.equal(f.writes.length, 0)
})

test('disposing a loading session aborts it and rejects late updates', async () => {
  const gate = deferred(), f = fixture({ read: () => gate.promise })
  const loading = f.session.load(); f.session.dispose(); gate.resolve(); await loading
  assert.equal(f.reads[0].aborted, true); assert.equal(f.publications(), 0)
  f.session.change({ transpose: 2, capo: 3 }); assert.equal(await f.session.flush(), false)
  assert.equal(f.writes.length, 0)
})

test('disposing an in-flight session prevents queued writes and stale UI publication', async () => {
  const gate = deferred(), f = fixture({ write: () => gate.promise })
  await f.session.load(); f.session.change({ transpose: 1, capo: null }); await tick()
  f.session.change({ transpose: 2, capo: 3 })
  const draining = f.session.flush(), count = f.publications()
  f.session.dispose(); gate.resolve()
  assert.equal(await draining, false); assert.equal(f.writes.length, 1)
  assert.equal(f.publications(), count)
})

test('published snapshots cannot mutate the stored version used by the next save', async () => {
  const f = fixture(); await f.session.load()
  const view = f.session.snapshot(); view.saved.version = 100; view.saved.entryId = 'foreign'
  f.session.change({ transpose: 2, capo: 3 }); await f.session.flush()
  assert.equal(f.writes[0].version, 0); assert.equal(f.writes[0].entryId, 'list-song')
})
