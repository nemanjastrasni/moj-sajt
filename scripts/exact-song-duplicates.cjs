/* eslint-disable @typescript-eslint/no-require-imports -- Manually invoked, gated and transactional duplicate cleanup. */
const fs = require('node:fs/promises'), path = require('node:path'), { parseArgs } = require('node:util'), { createHash } = require('node:crypto')
const core = require('./lib/exact-song-duplicates.cjs'), { databaseClient } = require('./lib/artist-image-source.cjs')
const ROOT = path.resolve(__dirname, '..'), quote = value => '"' + value.replaceAll('"', '""') + '"'
async function durable(file, data) {
  const handle = await fs.open(file, 'wx', 0o600)
  try { await handle.writeFile(JSON.stringify(data, null, 2) + '\n'); await handle.sync() } finally { await handle.close() }
}
async function load(db, ids) {
  if (!ids) ids = (await db.query(`SELECT unnest(ids) AS id FROM (SELECT array_agg(id) AS ids FROM public."Song"
    WHERE length(lyrics)>0 GROUP BY "artistId",category,md5(title),md5(lyrics),md5(chords) HAVING count(*)>1) pairs`)).rows.map(row => row.id)
  const songs = (await db.query('SELECT * FROM public."Song" WHERE id=ANY($1::text[]) ORDER BY id', [ids])).rows
  const artists = (await db.query('SELECT id,name,slug,category FROM public."Artist" WHERE id=ANY($1::text[]) ORDER BY id', [[...new Set(songs.map(row => row.artistId))]])).rows
  const keys = (await db.query(`SELECT n.nspname AS schema,t.relname AS table,array_agg(a.attname::text ORDER BY k.ordinality) AS columns
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum
    WHERE c.contype='f' AND c.confrelid='public."Song"'::regclass GROUP BY c.conname,n.nspname,t.relname ORDER BY n.nspname,t.relname,c.conname`)).rows
  const references = []
  for (const key of keys) {
    core.requireThat(key.schema === 'public' && key.columns.length === 1, 'UNREVIEWED_FOREIGN_KEY')
    const column = key.columns[0]
    const rows = (await db.query('SELECT DISTINCT ' + quote(column) + ' FROM public.' + quote(key.table) + ' WHERE ' + quote(column) + '=ANY($1::text[]) ORDER BY ' + quote(column), [ids])).rows
    references.push({ table: key.table, column, rows })
  }
  // Artist-merge redirects and historical proposals contain IDs without a foreign key.
  // Preserve every song mentioned there, including audit-only references.
  const auditIds = new Set()
  for (const row of (await db.query('SELECT "subjectId",data FROM public."AdminContentProposal"')).rows) {
    const text = JSON.stringify(row)
    for (const id of ids) if (text.includes(id)) auditIds.add(id)
  }
  return { songs, artists, references, auditIds: [...auditIds] }
}
async function lock(db, plan) {
  await db.query("SET LOCAL lock_timeout='5s'")
  await db.query("SELECT pg_advisory_xact_lock(hashtext('exact-song-duplicates-v1'))")
  await db.query('LOCK TABLE public."AdminContentProposal" IN SHARE MODE')
  await db.query('SELECT id FROM public."Artist" WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', [[...new Set(plan.pairs.map(pair => pair.artistId))]])
  await db.query('SELECT id FROM public."Song" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [plan.pairs.flatMap(pair => [pair.keep.id, pair.remove.id])])
}
async function verifyBackup(values) {
  core.requireThat(values.backup && values.key, 'VERIFIED_ENCRYPTED_BACKUP_AND_KEY_REQUIRED')
  const backup = require('./lib/application-backup.cjs'), file = path.resolve(values.backup)
  const { root, keyFile } = backup.backupLocation(path.dirname(file), values.key)
  const key = await backup.readKey(keyFile), { workRoot, work } = await backup.workDirectory(root)
  try {
    const manifest = await backup.decryptArchive(file, path.join(work, 'payload'), path.join(work, 'archive'), key)
    const sourceId = createHash('sha256').update(new URL(process.env.DATABASE_URL).hostname).digest('hex').slice(0, 16)
    const age = Date.now() - Date.parse(manifest.createdAt)
    core.requireThat(manifest.sourceId === sourceId && manifest.tables.some(table => table.name === 'Song') && age >= 0 && age < 3600000, 'BACKUP_WRONG_SOURCE_OR_TOO_OLD')
    return { createdAt: manifest.createdAt, encryptedSha256: await backup.hashFile(file), authenticated: true }
  } finally { await backup.cleanup(workRoot, work) }
}
async function main() {
  const { values } = parseArgs({ options: { mode: { type: 'string', default: 'plan' }, plan: { type: 'string' }, ca: { type: 'string' }, origin: { type: 'string', default: 'https://www.gitarakordi.com' }, backup: { type: 'string' }, key: { type: 'string' }, journal: { type: 'string' } } })
  core.requireThat(['plan', 'check', 'apply', 'rollback'].includes(values.mode), 'MODE_MUST_BE_PLAN_CHECK_APPLY_OR_ROLLBACK')
  require('@next/env').loadEnvConfig(ROOT, false, { info() {}, error() {} })
  const { types } = require('pg'); types.setTypeParser(1114, value => value); types.setTypeParser(1184, value => value)
  let plan, redirectCheck, backupCheck
  if (values.mode !== 'plan') {
    core.requireThat(values.plan, 'PLAN_REQUIRED')
    plan = JSON.parse(await fs.readFile(path.resolve(values.plan), 'utf8'))
    core.validateRedirects(plan.pairs, require('../lib/seo/legacy-redirects.json'))
    const published = require('../lib/seo/exact-song-redirects.json')
    core.requireThat(core.hash(published) === core.hash(plan.pairs.map(({ source, destination, permanent }) => ({ source, destination, permanent }))), 'REDIRECT_FILE_DOES_NOT_MATCH_PLAN')
    if (values.mode === 'apply') {
      // This deliberately runs before any SQL mutation. A successful deploy is mandatory.
      redirectCheck = await core.verifyRedirects(values.origin, fetch, plan.pairs)
      backupCheck = await verifyBackup(values)
    }
  }
  const db = await databaseClient(values.ca)
  let commitAttempted = false
  try {
    await db.query(values.mode === 'plan' ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN ISOLATION LEVEL SERIALIZABLE')
    await db.query("SET LOCAL statement_timeout='30s'")
    if (values.mode !== 'plan') await lock(db, plan)
    const ids = plan?.pairs.flatMap(pair => [pair.keep.id, pair.remove.id]), before = await load(db, ids)
    if (values.mode === 'plan') {
      plan = core.makePlan(before, require('../lib/seo/song-search-review-rules.json'))
      core.validateRedirects(plan.pairs, require('../lib/seo/legacy-redirects.json'))
      core.requireThat(values.plan, 'OUTPUT_PLAN_PATH_REQUIRED')
      await durable(path.resolve(values.plan), plan)
      await db.query('ROLLBACK')
      console.log(JSON.stringify({ mode: 'plan', pairs: plan.pairs.length, skipped: plan.skipped.length, writes: 0, plan: path.resolve(values.plan) })); return
    }
    if (values.mode === 'rollback') {
      core.requireThat(values.journal, 'COMMITTED_JOURNAL_REQUIRED')
      const directory = path.resolve(values.journal), journal = JSON.parse(await fs.readFile(path.join(directory, 'before.json'), 'utf8'))
      const result = JSON.parse(await fs.readFile(path.join(directory, 'result.json'), 'utf8'))
      core.requireThat(result.committed === true && journal.planHash === core.hash(plan), 'INVALID_JOURNAL')
      core.requireThat(journal.rows.length === plan.pairs.length && new Set(journal.rows.map(row => row.id)).size === journal.rows.length && journal.rows.every(row => plan.pairs.some(pair => pair.remove.id === row.id && row.slug === pair.remove.slug && core.hash([row.title, row.lyrics, row.chords]) === pair.contentHash && core.hash(core.musical(row)) === pair.metadataHash)), 'INVALID_RESTORE_ROWS')
      core.requireThat(plan.pairs.every(pair => !before.songs.some(row => row.id === pair.remove.id) && core.hash(before.songs.find(row => row.id === pair.keep.id)) === journal.keepers[pair.keep.id]), 'LATER_EDIT_BLOCKS_ROLLBACK')
      for (const row of journal.rows) await db.query('INSERT INTO public."Song" SELECT * FROM jsonb_populate_record(NULL::public."Song",$1::jsonb)', [JSON.stringify(row)])
      const restored = await load(db, ids)
      core.requireThat(journal.rows.every(row => core.hash(restored.songs.find(item => item.id === row.id)) === core.hash(row)), 'RESTORE_CHECK_FAILED')
      commitAttempted = true; await db.query('COMMIT')
      console.log(JSON.stringify({ mode: 'rollback', committed: true, restored: journal.rows.length })); return
    }
    core.assertPlan(plan, before)
    if (values.mode === 'check') {
      // Exercise DELETE + FK constraints, then roll back the entire transaction.
      await core.removeSongs(db, plan)
      await db.query('ROLLBACK')
      console.log(JSON.stringify({ mode: 'check', exactPairs: plan.pairs.length, transactionRolledBack: true, committed: false })); return
    }
    core.requireThat(values.journal, 'PRIVATE_JOURNAL_DIRECTORY_REQUIRED')
    const backup = require('./lib/application-backup.cjs'), directory = path.resolve(values.journal)
    core.requireThat(!directory.startsWith(ROOT + path.sep), 'JOURNAL_MUST_BE_OUTSIDE_REPOSITORY')
    await backup.privateDirectory(directory)
    const rows = before.songs.filter(row => plan.pairs.some(pair => pair.remove.id === row.id)), keepers = Object.fromEntries(before.songs.filter(row => plan.pairs.some(pair => pair.keep.id === row.id)).map(row => [row.id, core.hash(row)]))
    await durable(path.join(directory, 'before.json'), { planHash: core.hash(plan), redirectCheck, backupCheck, rows, keepers })
    await core.removeSongs(db, plan)
    const after = await load(db, ids)
    core.requireThat(after.songs.length === before.songs.length - plan.pairs.length && after.songs.every(row => core.hash(row) === core.hash(before.songs.find(item => item.id === row.id))) && core.hash(after.references) === core.hash(before.references), 'UNEXPECTED_CHANGE')
    commitAttempted = true; await db.query('COMMIT')
    await durable(path.join(directory, 'result.json'), { committed: true, removed: rows.length, at: new Date().toISOString() })
    console.log(JSON.stringify({ mode: 'apply', committed: true, removed: rows.length, preservedRelations: true, redirectCheck }))
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {})
    if (commitAttempted) console.error('COMMIT_OUTCOME_REQUIRES_DATABASE_AND_JOURNAL_CHECK')
    throw error
  } finally { await db.end() }
}
if (require.main === module) main().catch(error => { console.error(JSON.stringify({ error: /^[A-Z_]+$/.test(error.message) ? error.message : 'DUPLICATE_MAINTENANCE_STOPPED', code: error.code || null })); process.exitCode = 1 })
module.exports = { load, lock, main }
