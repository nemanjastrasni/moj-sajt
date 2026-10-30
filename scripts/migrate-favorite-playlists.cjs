/* eslint-disable @typescript-eslint/no-require-imports -- Explicit, additive PostgreSQL migration with an untracked backup. */
const fs = require('node:fs/promises'), path = require('node:path'), { createHash, randomUUID } = require('node:crypto'), { parseArgs } = require('node:util')
const { databaseClient } = require('./lib/artist-image-source.cjs')
const ROOT = path.resolve(__dirname, '..')
const digest = rows => createHash('sha256').update(JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id)).map(row => [row.id, row.songId, row.transpose]))).digest('hex')
async function protectedHashes(db) {
  const result = {}
  for (const table of ['User', 'Song', 'SongReview', 'Favorite']) result[table] = (await db.query(`SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY id), '')) AS hash FROM public."${table}" t`.replace('ORDER BY id', table === 'SongReview' ? 'ORDER BY "songId"' : 'ORDER BY id'))).rows[0]
  return result
}
async function verify(db) {
  const state = (await db.query(`SELECT c.relrowsecurity AS rls, (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND tablename='FavoritePlaylist') AS policies, EXISTS (SELECT 1 FROM aclexplode(coalesce(c.relacl, acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee=0 OR r.rolname IN ('anon','authenticated')) AS public_grants FROM pg_class c WHERE c.oid='public."FavoritePlaylist"'::regclass`)).rows[0]
  if (!state?.rls || state.policies || state.public_grants) throw Error('Mapping must be private')
  const wrong = await db.query('SELECT 1 FROM public."FavoritePlaylist" f JOIN public."Playlist" p ON p.id=f."playlistId" WHERE p."userId"<>f."userId" LIMIT 1')
  if (wrong.rowCount) throw Error('Ownership mismatch')
  return state
}
async function migrate(db, apply, backup) {
  const favorites = (await db.query('SELECT id,"userId","songId",transpose,"createdAt" FROM public."Favorite" ORDER BY "createdAt",id')).rows
  if (favorites.some(row => !Number.isInteger(row.transpose) || row.transpose < -11 || row.transpose > 11)) throw Error('Invalid legacy transpose; no correction attempted')
  const exists = (await db.query("SELECT to_regclass('public.\"FavoritePlaylist\"') AS name")).rows[0].name
  const mappings = exists ? (await db.query('SELECT * FROM public."FavoritePlaylist"')).rows : []
  const groups = new Map()
  for (const row of favorites) { if (!groups.has(row.userId)) groups.set(row.userId, []); groups.get(row.userId).push(row) }
  const source = new Map(mappings.map(row => [row.userId, row]))
  const drift = [...groups].filter(([id, rows]) => source.has(id) && source.get(id).sourceHash !== digest(rows)).map(([userId]) => userId)
  const pending = [...groups].filter(([id]) => !source.has(id))
  const summary = { legacyFavorites: favorites.length, pendingUsers: pending.length, pendingSongs: pending.reduce((n, [, rows]) => n + rows.length, 0), mappedUsers: mappings.length, changedArchives: drift.length }
  if (!apply) return summary
  if (drift.length) throw Error('Archived favorites changed after migration; inspect before proceeding')
  await fs.writeFile(backup, JSON.stringify({ favorites, mappings, plan: summary, created: [] }, null, 2), { flag: 'wx' })
  const before = await protectedHashes(db)
  const existing = {}
  for (const table of ['Playlist', 'PlaylistSong', 'PlaylistSongSetting']) existing[table] = (await db.query(`SELECT to_jsonb(t) AS row FROM public."${table}" t`)).rows
  await db.query(await fs.readFile(path.join(ROOT, 'prisma/sql/favorite-playlist.sql'), 'utf8'))
  const created = []
  for (const [userId, rows] of pending) {
    const playlistId = 'omiljene_' + randomUUID().replaceAll('-', '')
    await db.query('INSERT INTO public."Playlist" (id,name,"userId","createdAt","isAdmin","isPublic",category) VALUES ($1,$2,$3,NOW(),false,false,$4)', [playlistId, 'Omiljene', userId, 'mix'])
    for (const [order, row] of rows.entries()) {
      const entryId = 'omiljena_' + randomUUID().replaceAll('-', '')
      await db.query('INSERT INTO public."PlaylistSong" (id,"playlistId","songId","order") VALUES ($1,$2,$3,$4)', [entryId, playlistId, row.songId, order])
      await db.query('INSERT INTO public."PlaylistSongSetting" ("playlistSongId","userId",transpose,capo,version,"updatedAt") VALUES ($1,$2,$3,NULL,1,NOW())', [entryId, userId, row.transpose])
    }
    await db.query('INSERT INTO public."FavoritePlaylist" ("userId","playlistId","sourceHash") VALUES ($1,$2,$3)', [userId, playlistId, digest(rows)])
    const copied = (await db.query('SELECT s."songId",v.transpose,v.capo FROM public."PlaylistSong" s JOIN public."PlaylistSongSetting" v ON v."playlistSongId"=s.id WHERE s."playlistId"=$1 ORDER BY s."order",s.id', [playlistId])).rows
    if (JSON.stringify(copied) !== JSON.stringify(rows.map(row => ({ songId: row.songId, transpose: row.transpose, capo: null })))) throw Error('Copy verification failed')
    created.push({ userId, playlistId, songs: rows.length })
  }
  for (const [table, old] of Object.entries(existing)) {
    const key = table === 'PlaylistSongSetting' ? 'playlistSongId' : 'id'
    const current = (await db.query(`SELECT to_jsonb(t) AS row FROM public."${table}" t WHERE "${key}"=ANY($1::text[]) ORDER BY "${key}"`, [old.map(item => item.row[key])])).rows
    if (JSON.stringify(current) !== JSON.stringify(old.sort((a, b) => a.row[key].localeCompare(b.row[key])))) throw Error('Existing playlist data changed')
  }
  if (JSON.stringify(before) !== JSON.stringify(await protectedHashes(db))) throw Error('Protected data changed')
  await verify(db)
  await fs.writeFile(backup, JSON.stringify({ favorites, mappings, plan: summary, created, protectedRowsUnchanged: true }, null, 2))
  return { ...summary, createdPlaylists: created.length, copiedSongs: created.reduce((n, row) => n + row.songs, 0) }
}
async function main() {
  const { values } = parseArgs({ options: { ca: { type: 'string' }, apply: { type: 'boolean', default: false } } })
  if (!values.ca) throw Error('Provide a verified CA certificate')
  require('@next/env').loadEnvConfig(ROOT)
  const db = await databaseClient(values.ca)
  const backup = path.join(ROOT, 'reports/favorite-playlists/migration-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json')
  let committed = false
  try {
    await db.query(values.apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN READ ONLY')
    await db.query("SET LOCAL lock_timeout='5s'")
    if (values.apply) { await fs.mkdir(path.dirname(backup), { recursive: true }); await db.query('LOCK TABLE public."Favorite",public."Playlist",public."PlaylistSong",public."PlaylistSongSetting" IN SHARE ROW EXCLUSIVE MODE') }
    const result = await migrate(db, values.apply, backup)
    await db.query(values.apply ? 'COMMIT' : 'ROLLBACK'); committed = values.apply
    console.log(JSON.stringify({ applied: values.apply, ...result, ...(values.apply ? { backup } : {}) }))
    if (result.changedArchives) process.exitCode = 1
  } catch (error) { if (!committed) await db.query('ROLLBACK').catch(() => {}); throw error }
  finally { await db.end() }
  if (values.apply) { const fresh = await databaseClient(values.ca); try { console.log(JSON.stringify({ independentlyVerified: true, security: await verify(fresh) })) } finally { await fresh.end() } }
}
if (require.main === module) main().catch(error => { console.error('Favorites migration stopped:', error.code || error.name); process.exitCode = 1 })
module.exports = { digest, migrate, verify }
