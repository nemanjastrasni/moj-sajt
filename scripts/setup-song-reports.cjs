/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in CommonJS schema setup. */
const fs = require("node:fs/promises")
const path = require("node:path")
const { createHash } = require("node:crypto")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { databaseClient } = require("./lib/artist-image-source.cjs")
const expected = { id: "text", songId: "text", userId: "text", kind: "text", description: "text", songTitle: "text", artistName: "text", songVersion: "text", transpose: "int4", status: "text", reviewNote: "text", reviewerId: "text", createdAt: "timestamp", updatedAt: "timestamp", reviewedAt: "timestamp" }
const protectedTables = ["User", "Artist", "Song", "SongReview", "Favorite", "Playlist", "PlaylistSong"]
async function counts(client) {
  const result = {}
  for (const table of protectedTables) result[table] = Number((await client.query(`SELECT count(*) FROM public."${table}"`)).rows[0].count)
  return result
}
async function inspect(client) {
  const columns = (await client.query("SELECT column_name, udt_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SongReport' ORDER BY ordinal_position")).rows
  if (!columns.length) return { exists: false }
  const constraints = (await client.query("SELECT conname, contype, confdeltype, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'public.\"SongReport\"'::regclass ORDER BY conname")).rows
  const indexes = (await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'SongReport' ORDER BY indexname")).rows
  const table = (await client.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.\"SongReport\"'::regclass")).rows[0]
  const rows = Number((await client.query('SELECT count(*) FROM public."SongReport"')).rows[0].count)
  return { exists: true, columns, constraints, indexes, rls: table.relrowsecurity, rows }
}
function verify(state) {
  if (!state.exists || state.columns.length !== Object.keys(expected).length || state.columns.some(column => expected[column.column_name] !== column.udt_name)) throw Error("Unexpected SongReport columns; preserved")
  const nullable = new Set(["songId", "userId", "reviewNote", "reviewerId", "reviewedAt"])
  if (state.columns.some(column => (column.is_nullable === "YES") !== nullable.has(column.column_name))) throw Error("Unexpected SongReport nullability; preserved")
  for (const name of ["pkey", "songId_fkey", "userId_fkey", "kind_check", "status_check", "description_check", "note_check", "version_check", "transpose_check"]) if (!state.constraints.some(c => c.conname === "SongReport_" + name)) throw Error("Incomplete SongReport constraints; preserved")
  if (state.constraints.filter(c => c.contype === "f").some(c => c.confdeltype !== "n")) throw Error("Unexpected report delete behavior; preserved")
  if (!state.indexes.some(index => index.indexname === "SongReport_pending_unique" && /CREATE UNIQUE INDEX/.test(index.indexdef) && /WHERE/.test(index.indexdef))) throw Error("Missing pending-report uniqueness; preserved")
  if (!state.rls) throw Error("Report RLS is not enabled")
}
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, apply: { type: "boolean", default: false } } })
  const root = path.resolve(__dirname, ".."); loadEnvConfig(root)
  const sql = await fs.readFile(path.join(root, "prisma/sql/song-reports.sql"), "utf8"), client = await databaseClient(values.ca)
  let committed = false, backup
  try {
    await client.query(values.apply ? "BEGIN ISOLATION LEVEL REPEATABLE READ" : "BEGIN READ ONLY")
    await client.query("SET LOCAL lock_timeout = '5s'")
    const before = await inspect(client), beforeCounts = await counts(client)
    if (before.exists) verify(before)
    if (!values.apply) { await client.query("ROLLBACK"); console.log(JSON.stringify({ apply: false, tableExists: before.exists, existingReports: before.rows ?? 0, protectedCounts: beforeCounts, plannedChange: "Add SongReport table/indexes/RLS only; no song/user/playlist/review writes" })); return }
    const directory = path.join(root, "reports/song-reports"); await fs.mkdir(directory, { recursive: true })
    backup = path.join(directory, "setup-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json")
    await fs.writeFile(backup, JSON.stringify({ before, protectedCounts: beforeCounts, sqlHash: createHash("sha256").update(sql).digest("hex"), accountOrReportContentIncluded: false }, null, 2), { flag: "wx" })
    if (!before.exists) await client.query(sql)
    const after = await inspect(client); verify(after)
    const afterCounts = await counts(client)
    if (JSON.stringify(beforeCounts) !== JSON.stringify(afterCounts) || (before.rows ?? 0) !== after.rows) throw Error("Unexpected data change; rolling back")
    await client.query("COMMIT"); committed = true
    console.log(JSON.stringify({ applied: true, created: !before.exists, reportCount: after.rows, protectedCounts: afterCounts, backup }))
  } catch (error) { if (!committed) await client.query("ROLLBACK").catch(() => {}); throw error }
  finally { await client.end() }
  const check = await databaseClient(values.ca)
  try { const state = await inspect(check); verify(state); console.log(JSON.stringify({ independentlyVerified: true, reportCount: state.rows })) } finally { await check.end() }
}
if (require.main === module) main().catch(error => { console.error("Song report setup stopped:", error.code || error.name); process.exitCode = 1 })
module.exports = { inspect, verify, expected, protectedTables }
