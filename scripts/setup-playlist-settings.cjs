/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in additive database setup. */
const fs = require("node:fs/promises"), path = require("node:path"), { createHash } = require("node:crypto"), { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env"), { databaseClient } = require("./lib/artist-image-source.cjs")
const ROOT = path.resolve(__dirname, ".."), TABLES = ["User", "Artist", "Song", "SongReview", "Favorite", "Playlist", "PlaylistSong"]
async function protectedState(db) {
  const result = {}
  for (const table of TABLES) result[table] = (await db.query(`SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), '')) AS hash FROM public."${table}" t`)).rows[0]
  return result
}
async function inspect(db) {
  const columns = (await db.query("SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='PlaylistSongSetting' ORDER BY ordinal_position")).rows
  if (!columns.length) return { exists: false }
  const constraints = (await db.query(`SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public."PlaylistSongSetting"'::regclass ORDER BY conname`)).rows
  const security = (await db.query(`SELECT c.relrowsecurity AS rls, (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND tablename='PlaylistSongSetting') AS policies, EXISTS (SELECT 1 FROM aclexplode(coalesce(c.relacl, acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee=0 OR r.rolname IN ('anon','authenticated')) AS public_grants FROM pg_class c WHERE c.oid='public."PlaylistSongSetting"'::regclass`)).rows[0]
  const data = (await db.query('SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text), \'\' ORDER BY "playlistSongId"), \'\')) AS hash FROM public."PlaylistSongSetting" t')).rows[0]
  return { exists: true, columns, constraints, security, data }
}
function verify(state) {
  const expected = { playlistSongId: "text", userId: "text", transpose: "int4", capo: "int4", version: "int4", updatedAt: "timestamp" }
  if (!state.exists || state.columns.length !== 6 || state.columns.some(column => expected[column.column_name] !== column.udt_name || (column.is_nullable === "YES") !== (column.column_name === "capo"))) throw Error("Incompatible existing settings schema; preserved")
  for (const suffix of ["pkey", "playlistSongId_fkey", "transpose_check", "capo_check", "version_check"]) if (!state.constraints.some(item => item.conname === "PlaylistSongSetting_" + suffix)) throw Error("Incomplete settings constraints; preserved")
  if (!state.constraints.find(item => item.conname.endsWith("_fkey"))?.definition.includes("ON DELETE CASCADE")) throw Error("Unexpected deletion behavior")
  if (!state.security.rls || state.security.policies !== 0 || state.security.public_grants) throw Error("Settings table must be private")
}
async function checkSchema(db, sql) {
  const name = "settings_test_" + require("node:crypto").randomBytes(6).toString("hex"), schema = '"' + name + '"'
  await db.query("BEGIN")
  try {
    await db.query(`CREATE SCHEMA ${schema}`)
    await db.query(`CREATE TABLE ${schema}."PlaylistSong" (id text PRIMARY KEY)`)
    const isolated = sql.replaceAll('public.', schema + '.')
    await db.query(isolated); await db.query(isolated)
    await db.query(`INSERT INTO ${schema}."PlaylistSong" VALUES ('entry')`)
    await db.query(`INSERT INTO ${schema}."PlaylistSongSetting" ("playlistSongId","userId",transpose,capo) VALUES ('entry','owner',-2,5)`)
    for (const update of ['transpose=12', 'transpose=-12', 'capo=-1', 'capo=13', 'version=0']) {
      await db.query("SAVEPOINT invalid_value")
      let rejected = false
      try { await db.query(`UPDATE ${schema}."PlaylistSongSetting" SET ${update}`) } catch (error) { if (error.code === "23514") rejected = true; else throw error }
      await db.query("ROLLBACK TO SAVEPOINT invalid_value")
      if (!rejected) throw Error("Constraint did not reject " + update)
    }
    if ((await db.query(`UPDATE ${schema}."PlaylistSongSetting" SET version=2 WHERE version=1`)).rowCount !== 1 || (await db.query(`UPDATE ${schema}."PlaylistSongSetting" SET version=3 WHERE version=1`)).rowCount !== 0) throw Error("Version check failed")
    await db.query(`DELETE FROM ${schema}."PlaylistSong" WHERE id='entry'`)
    if (Number((await db.query(`SELECT count(*) FROM ${schema}."PlaylistSongSetting"`)).rows[0].count)) throw Error("Cascade failed")
    console.log(JSON.stringify({ schemaTest: true, publicWrites: 0, rolledBack: true }))
  } finally { await db.query("ROLLBACK") }
}
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, apply: { type: "boolean", default: false }, "check-schema": { type: "boolean", default: false } } })
  loadEnvConfig(ROOT)
  const sql = await fs.readFile(path.join(ROOT, "prisma/sql/playlist-song-settings.sql"), "utf8"), db = await databaseClient(values.ca)
  let committed = false
  try {
    if (values["check-schema"]) { await checkSchema(db, sql); return }
    await db.query(values.apply ? "BEGIN ISOLATION LEVEL REPEATABLE READ" : "BEGIN READ ONLY")
    await db.query("SET LOCAL lock_timeout='5s'")
    const before = await inspect(db), protectedBefore = await protectedState(db)
    if (before.exists) verify(before)
    if (!values.apply) { await db.query("ROLLBACK"); console.log(JSON.stringify({ apply: false, tableExists: before.exists, protectedCounts: Object.fromEntries(Object.entries(protectedBefore).map(([key, value]) => [key, value.count])) })); return }
    const backup = path.join(ROOT, "reports/playlist-settings/setup-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json")
    await fs.mkdir(path.dirname(backup), { recursive: true })
    await fs.writeFile(backup, JSON.stringify({ before, protectedBefore, sqlHash: createHash("sha256").update(sql).digest("hex"), accountContentIncluded: false }, null, 2), { flag: "wx" })
    await db.query(sql)
    const after = await inspect(db); verify(after)
    if (JSON.stringify(protectedBefore) !== JSON.stringify(await protectedState(db)) || before.exists && JSON.stringify(before.data) !== JSON.stringify(after.data) || !before.exists && after.data.count !== 0) throw Error("Unexpected data change; rollback")
    await db.query("COMMIT"); committed = true
    console.log(JSON.stringify({ applied: true, created: !before.exists, settingsRows: after.data.count, protectedRowsUnchanged: true, backup }))
  } catch (error) { if (!committed) await db.query("ROLLBACK").catch(() => {}); throw error }
  finally { await db.end() }
  const fresh = await databaseClient(values.ca)
  try { const state = await inspect(fresh); verify(state); console.log(JSON.stringify({ independentlyVerified: true, security: state.security, settingsRows: state.data.count })) } finally { await fresh.end() }
}
if (require.main === module) main().catch(error => { console.error("Settings setup stopped:", error.code || error.name); process.exitCode = 1 })
module.exports = { verify, inspect, checkSchema }
