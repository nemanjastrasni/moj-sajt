/* eslint-disable @typescript-eslint/no-require-imports -- Rollback-only schema checks. */
const fs = require("node:fs/promises")
const path = require("node:path")
const assert = require("node:assert/strict")
const { randomBytes } = require("node:crypto")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { databaseClient } = require("./lib/artist-image-source.cjs")
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" } } }), root = path.resolve(__dirname, "..")
  loadEnvConfig(root)
  const schema = "report_test_" + randomBytes(6).toString("hex"), client = await databaseClient(values.ca)
  const sql = (await fs.readFile(path.join(root, "prisma/sql/song-reports.sql"), "utf8")).replaceAll('public.', `"${schema}".`)
  try {
    await client.query("BEGIN")
    await client.query(`CREATE SCHEMA "${schema}"`)
    await client.query(`CREATE TABLE "${schema}"."User" (id TEXT PRIMARY KEY); CREATE TABLE "${schema}"."Song" (id TEXT PRIMARY KEY)`)
    await client.query(sql)
    await client.query(sql)
    await client.query(`INSERT INTO "${schema}"."User" VALUES ('user'); INSERT INTO "${schema}"."Song" VALUES ('song')`)
    const insert = `INSERT INTO "${schema}"."SongReport" (id, "songId", "userId", kind, description, "songTitle", "artistName", "songVersion", transpose) VALUES ($1, 'song', 'user', $2, $3, 'Song', 'Band', $4, $5)`
    await client.query(insert, ["report", "layout", "Second verse placement", "a".repeat(64), 2])
    async function rejects(values, code) {
      await client.query("SAVEPOINT invalid_report")
      try { await assert.rejects(client.query(insert, values), error => error.code === code) }
      finally { await client.query("ROLLBACK TO SAVEPOINT invalid_report"); await client.query("RELEASE SAVEPOINT invalid_report") }
    }
    await rejects(["duplicate", "layout", "Duplicate pending report", "a".repeat(64), 0], "23505")
    await rejects(["invalid", "other", "Some readable details", "a".repeat(64), 0], "23514")
    await rejects(["short", "lyrics", "short", "a".repeat(64), 0], "23514")
    await rejects(["version", "lyrics", "Some readable details", "bad", 0], "23514")
    await rejects(["key", "lyrics", "Some readable details", "a".repeat(64), 12], "23514")
    await client.query(`UPDATE "${schema}"."SongReport" SET status = 'resolved' WHERE id = 'report'`)
    await client.query(insert, ["new-report", "layout", "A newly found layout error", "a".repeat(64), 0])
    await client.query(`DELETE FROM "${schema}"."Song" WHERE id = 'song'; DELETE FROM "${schema}"."User" WHERE id = 'user'`)
    const rows = (await client.query(`SELECT "songId", "userId", "songTitle" FROM "${schema}"."SongReport"`)).rows
    assert.equal(rows.length, 2); assert.ok(rows.every(row => row.songId === null && row.userId === null && row.songTitle === "Song"))
    assert.equal((await client.query("SELECT relrowsecurity FROM pg_class WHERE oid = $1::regclass", [`"${schema}"."SongReport"`])).rows[0].relrowsecurity, true)
    console.log("PASS: real PostgreSQL DDL, idempotent setup, bounded values, pending uniqueness, resolved resubmission, deletion keeps report snapshots, RLS. All test schema/data rolled back; no public data writes.")
  } finally { await client.query("ROLLBACK").catch(() => {}); await client.end() }
}
main().catch(error => { console.error("Report schema check stopped:", error.code || error.name); process.exitCode = 1 })
