/* eslint-disable @typescript-eslint/no-require-imports -- Approved additive table setup with backups. */
const fs = require("node:fs/promises"), path = require("node:path"), { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env"), { databaseClient } = require("./lib/artist-image-source.cjs")
const { snapshot, dataState, verify, quote } = require("./harden-database-access.cjs")
const ROOT = path.resolve(__dirname, "..")
async function inspect(db) {
  const columns = (await db.query("SELECT column_name,udt_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='SongTutorial' ORDER BY ordinal_position")).rows
  if (!columns.length) return { exists: false }
  const constraints = (await db.query(`SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public."SongTutorial"'::regclass ORDER BY conname`)).rows
  const count = (await db.query('SELECT count(*)::int AS count FROM public."SongTutorial"')).rows[0].count
  return { exists: true, columns, constraints, count }
}
function validate(state) {
  const expected = { songId: "text", videoId: "text", title: "text", version: "text", updatedById: "text", updatedAt: "timestamp" }
  if (!state.exists || state.columns.length !== 6 || state.columns.some(column => expected[column.column_name] !== column.udt_name || column.is_nullable !== "NO")) throw Error("Unexpected tutorial schema; preserved")
  for (const suffix of ["pkey", "songId_fkey", "videoId_check", "title_check", "version_check"]) if (!state.constraints.some(item => item.conname === "SongTutorial_" + suffix)) throw Error("Incomplete tutorial constraints")
  if (!state.constraints.find(item => item.conname.endsWith("_fkey"))?.definition.includes("ON DELETE CASCADE")) throw Error("Unexpected tutorial foreign key")
}
async function schemaTest(db, sql) {
  await db.query("BEGIN")
  const schema = '"tutorials_test_' + require("node:crypto").randomBytes(6).toString("hex") + '"'
  try {
    await db.query(`CREATE SCHEMA ${schema}; CREATE TABLE ${schema}."Song" (id text PRIMARY KEY)`)
    await db.query(sql.replaceAll("public.", schema + ".")); await db.query(sql.replaceAll("public.", schema + "."))
    await db.query(`INSERT INTO ${schema}."Song" VALUES ('song')`)
    const version = "a4b1eaad-883e-4816-b8d6-bd377fc191bb"
    await db.query(`INSERT INTO ${schema}."SongTutorial" ("songId","videoId",version,"updatedById") VALUES ('song','AAAAAAAAAAA',$1,'admin')`, [version])
    for (const update of ["\"videoId\"='bad'", "title=repeat('x',121)", "version='------------------------------------'"]) {
      await db.query("SAVEPOINT invalid")
      let rejected = false
      try { await db.query(`UPDATE ${schema}."SongTutorial" SET ${update}`) } catch (error) { if (error.code === "23514") rejected = true; else throw error }
      await db.query("ROLLBACK TO SAVEPOINT invalid")
      if (!rejected) throw Error("Tutorial constraint failed")
    }
    await db.query(`DELETE FROM ${schema}."Song" WHERE id='song'`)
    if ((await db.query(`SELECT count(*)::int AS count FROM ${schema}."SongTutorial"`)).rows[0].count) throw Error("Cascade failed")
    console.log("Tutorial schema checks passed; temporary schema rolled back.")
  } finally { await db.query("ROLLBACK") }
}
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, apply: { type: "boolean", default: false }, "check-schema": { type: "boolean", default: false } } })
  loadEnvConfig(ROOT)
  const sql = await fs.readFile(path.join(ROOT, "prisma/sql/song-tutorials.sql"), "utf8"), db = await databaseClient(values.ca)
  let committed = false
  try {
    if (values["check-schema"]) { await schemaTest(db, sql); return }
    await db.query(values.apply ? "BEGIN ISOLATION LEVEL REPEATABLE READ" : "BEGIN READ ONLY")
    await db.query("SET LOCAL lock_timeout='5s'")
    const before = await inspect(db), security = await snapshot(db)
    if (before.exists) { validate(before); await verify(db) }
    if (!values.apply) { console.log(JSON.stringify({ apply: false, exists: before.exists })); await db.query("ROLLBACK"); return }
    await db.query(`LOCK TABLE ${security.objects.filter(item => item.relkind !== "S").map(item => "public." + quote(item.relname)).join(",")} IN SHARE MODE`)
    const rowsBefore = await dataState(db, security.objects)
    const backup = path.join(ROOT, "reports/database-access/tutorials-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json")
    await fs.mkdir(path.dirname(backup), { recursive: true })
    await fs.writeFile(backup, JSON.stringify({ before, security, rowsBefore, containsUserContent: false }, null, 2), { flag: "wx" })
    await db.query(sql)
    const after = await inspect(db); validate(after); await verify(db)
    if (after.count !== (before.count ?? 0) || JSON.stringify(rowsBefore) !== JSON.stringify(await dataState(db, security.objects))) throw Error("Unexpected row changes; rollback")
    await db.query("COMMIT"); committed = true
    console.log(JSON.stringify({ applied: true, created: !before.exists, count: after.count, existingRowsUnchanged: true, backup }))
  } catch (error) { if (!committed) await db.query("ROLLBACK").catch(() => {}); throw error }
  finally { await db.end() }
  const fresh = await databaseClient(values.ca)
  try { const state = await inspect(fresh); validate(state); await verify(fresh); console.log(JSON.stringify({ independentlyVerified: true, tutorialRows: state.count })) } finally { await fresh.end() }
}
if (require.main === module) main().catch(error => { console.error("Tutorial setup stopped:", error.code || error.message); process.exitCode = 1 })
module.exports = { validate }
