/* eslint-disable @typescript-eslint/no-require-imports -- Isolated transactional fixtures for the additive favorites migration. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } })
const { test, beforeEach } = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path')
const { Prisma } = require('@prisma/client')
let state, session, down, fail, conflicts, attempts, membershipQuery
const tx = {
  user: { findUnique: async ({ where }) => { if (down) throw Error('secret database'); return state.users.find(user => user.id === where.id) ?? null } },
  favorite: { findMany: async ({ where }) => state.favorites.filter(row => row.userId === where.userId) },
  favoritePlaylist: {
    findUnique: async ({ where }) => state.sources.find(row => row.userId === where.userId) ?? null,
    create: async ({ data }) => { if (fail) throw Error('mapping failure'); state.sources.push(data); return data },
    update: async ({ where, data }) => { const row = state.sources.find(row => row.userId === where.userId); Object.assign(row, data); return row },
  },
  playlist: {
    findFirst: async ({ where }) => { const row = state.playlists.find(row => row.id === where.id && row.userId === where.userId); return row ? { id: row.id } : null },
    create: async ({ data }) => {
      const id = 'list-' + (state.playlists.length + 1), { songs, ...row } = data
      state.playlists.push({ ...row, id })
      for (const entry of songs.create) { const { setting, ...item } = entry, entryId = 'entry-' + state.items.length; state.items.push({ ...item, id: entryId, playlistId: id }); state.settings.push({ ...setting.create, playlistSongId: entryId }) }
      return { id }
    },
  },
  playlistSong: { findFirst: async query => { membershipQuery = query; return state.items.find(item => item.songId === query.where.songId && state.playlists.some(list => list.id === item.playlistId && list.userId === query.where.playlist.userId)) ?? null } },
}
const prisma = { ...tx, $transaction: async (work, options) => {
  assert.equal(options.isolationLevel, 'Serializable'); attempts++
  if (conflicts-- > 0) throw new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' })
  const before = structuredClone(state)
  try { return await work(tx) } catch (error) { state = before; throw error }
} }
const original = Module._load
Module._load = function(request, parent, main) {
  if (request === '@/lib/prisma') return { prisma }
  if (request === 'next-auth') return { getServerSession: async () => session }
  if (request === '@/lib/auth') return { authOptions: {} }
  if (request === 'next/cache') return { revalidatePath() {} }
  if (request.startsWith('@/')) request = path.join(__dirname, '..', request.slice(2))
  return original.call(this, request, parent, main)
}
let model, create, membership, legacy
try { model = require('../lib/playlists/omiljene.ts'); create = require('../app/api/playlist/omiljene/route.ts'); membership = require('../app/api/playlist/membership/route.ts'); legacy = require('../lib/favorites/server.ts') } finally { Module._load = original }
const request = (headers = {}, body = {}) => new Request('https://site.test/api/playlist/omiljene', { method: 'POST', headers: { origin: 'https://site.test', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
beforeEach(() => {
  state = { users: [{ id: 'one', banned: false }, { id: 'two', banned: false }], favorites: [{ id: 'a', userId: 'one', songId: 'first', transpose: 3 }, { id: 'b', userId: 'one', songId: 'second', transpose: -2 }, { id: 'c', userId: 'two', songId: 'other', transpose: 5 }], sources: [], playlists: [], items: [], settings: [] }
  session = { user: { id: 'one' } }; down = fail = false; conflicts = attempts = 0
})
test('favorites become a real private playlist with exact saved keys, order and no archive edits', async () => {
  const archive = structuredClone(state.favorites), result = await model.createOmiljene('one')
  assert.equal(result.id, 'list-1'); assert.equal(state.playlists[0].name, 'Omiljene'); assert.equal(state.playlists[0].isPublic, false)
  assert.deepEqual(state.items.map(item => [item.songId, item.order]), [['first', 0], ['second', 1]])
  assert.deepEqual(state.settings.map(item => [item.userId, item.transpose, item.capo, item.version]), [['one', 3, null, 1], ['one', -2, null, 1]])
  assert.deepEqual(state.favorites, archive); assert.equal(state.sources.length, 1)
  assert.match(state.sources[0].sourceHash, /^[a-f0-9]{64}$/)
})
test('retries never duplicate a playlist or overwrite user changes', async () => {
  const first = await model.createOmiljene('one'); state.settings[0].transpose = 7; state.playlists[0].name = 'Moj izbor'
  assert.deepEqual(await model.createOmiljene('one'), first)
  assert.equal(state.playlists.length, 1); assert.equal(state.items.length, 2); assert.equal(state.settings[0].transpose, 7)
})
test('deleted favorites playlist can be recreated empty without resurrecting removed songs', async () => {
  await model.createOmiljene('one'); state.sources[0].playlistId = null; state.playlists = []; state.items = []; state.settings = []
  await model.createOmiljene('one'); assert.equal(state.items.length, 0); assert.equal(state.favorites.length, 3)
})
test('a same-named unrelated playlist is never merged or made private', async () => {
  state.playlists.push({ id: 'existing', name: 'Omiljene', userId: 'one', isPublic: true })
  await model.createOmiljene('one'); assert.equal(state.playlists.length, 2); assert.equal(state.playlists[0].isPublic, true)
})
test('invalid destination ownership fails closed', async () => {
  state.sources.push({ userId: 'one', playlistId: 'other' }); state.playlists.push({ id: 'other', userId: 'two' })
  await assert.rejects(model.createOmiljene('one'), error => error.status === 409); assert.equal(state.items.length, 0)
})
test('copy and mapping commit atomically and serializable conflicts retry only twice', async () => {
  fail = true; const before = structuredClone(state); await assert.rejects(model.createOmiljene('one')); assert.deepEqual(state, before)
  fail = false; conflicts = 2; await model.createOmiljene('one'); assert.equal(state.playlists.length, 1); assert.equal(attempts, 4)
  conflicts = 3; await assert.rejects(model.createOmiljene('two')); assert.equal(state.playlists.length, 1); assert.equal(attempts, 7)
})
test('anonymous, banned and deleted accounts cannot create or read private membership', async () => {
  for (const variant of ['anonymous', 'banned', 'deleted']) {
    session = variant === 'anonymous' ? null : { user: { id: 'one' } }
    if (variant === 'banned') state.users[0].banned = true
    if (variant === 'deleted') state.users = []
    assert.ok([401, 403].includes((await create.POST(request())).status))
    assert.ok([401, 403].includes((await membership.GET(new Request('https://site.test/api/playlist/membership?songId=first'))).status))
  }
  assert.equal(state.playlists.length, 0)
})
test('cross-origin, wrong content type and forged user fields cannot create for another user', async () => {
  assert.equal((await create.POST(request({ origin: 'https://evil.test' }))).status, 403)
  assert.equal((await create.POST(request({ 'content-type': 'text/plain' }))).status, 415)
  assert.equal((await create.POST(request({}, { userId: 'two', isPublic: true }))).status, 200)
  assert.equal(state.playlists[0].userId, 'one'); assert.equal(state.playlists[0].isPublic, false)
})
test('yellow membership means this users playlists only, not someone elses', async () => {
  state.playlists = [{ id: 'mine', userId: 'one' }, { id: 'theirs', userId: 'two', isPublic: true }]
  state.items = [{ id: 'a', playlistId: 'mine', songId: 'first' }, { id: 'b', playlistId: 'theirs', songId: 'other' }]
  for (const [songId, expected] of [['first', true], ['other', false]]) {
    const response = await membership.GET(new Request('https://site.test/api/playlist/membership?songId=' + songId + '&userId=two'))
    assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.equal((await response.json()).inPlaylist, expected)
    assert.equal(membershipQuery.where.playlist.userId, 'one')
  }
})
test('archive mutation is rejected after conversion, without confusing a deleted list with no migration', async () => {
  await model.createOmiljene('one'); state.sources[0].playlistId = null
  await assert.rejects(legacy.checkedFavoriteUser(tx, 'one'), error => error.status === 409)
})
test('migration source hashes are stable and detect altered song keys', () => {
  const { digest } = require('./migrate-favorite-playlists.cjs')
  assert.equal(digest(state.favorites), digest([...state.favorites].reverse()))
  assert.notEqual(digest(state.favorites), digest(state.favorites.map(row => ({ ...row, transpose: 0 }))))
})
test('database outage never becomes a success or leaks implementation details', async () => {
  down = true; const response = await create.POST(request())
  assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.ok(!(await response.text()).includes('secret'))
})
