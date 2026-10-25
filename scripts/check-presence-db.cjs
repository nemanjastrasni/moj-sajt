/* eslint-disable @typescript-eslint/no-require-imports -- Temporary-table PostgreSQL regression test. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const fs = require("node:fs/promises")
const path = require("node:path")
const assert = require("node:assert/strict")
const Module = require("node:module")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { databaseClient } = require("./lib/artist-image-source.cjs")
const { presenceSnapshot } = require("../lib/presence/model.ts")
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" } } })
  loadEnvConfig(path.resolve(__dirname, ".."))
  const client = await databaseClient(values.ca)
  const scoped = sql => sql.replaceAll("public.online_presence", "pg_temp.online_presence").replaceAll('public."User"', 'pg_temp."User"')
  const prisma = {
    $executeRaw: async (strings, ...values) => client.query(scoped(strings.map((part, index) => part + (index < values.length ? "$" + (index + 1) : "")).join("")), values),
    $queryRaw: async query => (await client.query(scoped(query.text), query.values)).rows,
  }
  const original = Module._load
  Module._load = function(request, parent, isMain) {
    if (request === "@/lib/prisma") return { prisma }
    if (request === "@/lib/adminSongs/server") return { requireSongAdmin: async () => ({ id: "fixture" }) }
    return original.call(this, request, parent, isMain)
  }
  let server
  try { server = require("../lib/presence/server.ts") } finally { Module._load = original }
  try {
    await client.query("BEGIN")
    await client.query('CREATE TEMP TABLE "User" (id TEXT PRIMARY KEY, banned BOOLEAN NOT NULL DEFAULT false) ON COMMIT DROP')
    await client.query("CREATE TEMP TABLE online_presence (visitor_id TEXT PRIMARY KEY, user_id TEXT, last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()) ON COMMIT DROP")
    await client.query("INSERT INTO online_presence VALUES ('preserved',NULL,NOW())")
    const sql = scoped(await fs.readFile(path.join(__dirname, "../prisma/sql/online-presence.sql"), "utf8"))
    // Existing legacy presence rows survive both the migration and a repeated migration.
    await client.query(sql); await client.query(sql)
    assert.equal((await client.query("SELECT COUNT(*)::int AS n FROM pg_temp.online_presence")).rows[0].n, 1)
    await client.query("DELETE FROM pg_temp.online_presence")
    await client.query(`INSERT INTO pg_temp."User" VALUES ('u1',false),('u2',false),('banned',true)`)
    await server.recordPresence("device1", "u1", "RS")
    await server.recordPresence("device2", "u1", "DE")
    await server.recordPresence("device3", "u2", "US")
    await server.recordPresence("guest1", null, "RS")
    await server.recordPresence("banned-device", "banned", "RS")
    await server.recordPresence("deleted-device", "deleted", "RS")
    await client.query("INSERT INTO pg_temp.online_presence VALUES ('expired',NULL,NOW()-interval '11 minutes','RS'),('inactive','u1',NOW()-interval '3 minutes','FR')")
    const counts = await server.getPresenceCounts(), snapshot = await server.getAdminPresence()
    assert.deepEqual([counts.total, counts.loggedIn, counts.guests], [5, 2, 3])
    assert.deepEqual([snapshot.total, snapshot.loggedIn, snapshot.guests], [5, 2, 3])
    assert.deepEqual(snapshot.users.u1.countries.sort(), ["DE", "RS"])
    const rows = (await client.query("SELECT * FROM pg_temp.online_presence")).rows
    assert.ok(!rows.some(row => row.visitor_id === "expired"))
    await server.recordPresence("device1", null, null)
    const afterLogout = await server.getPresenceCounts()
    assert.deepEqual([afterLogout.total, afterLogout.loggedIn, afterLogout.guests], [6, 2, 4])
    const normalized = rows.map(row => ({ ...row, user_id: ["banned", "deleted"].includes(row.user_id) ? null : row.user_id }))
    assert.equal(presenceSnapshot(normalized, Date.now()).total, counts.total)
    await client.query("ROLLBACK")
    console.log("PASS: nullable country migration is idempotent and preserves legacy rows; real shared SQL deduplicates users, handles guest/logout/banned/deleted identities, hides inactive countries and cleans expired rows. Only temporary tables used; rolled back.")
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error }
  finally { await client.end() }
}
main().catch(error => { console.error("Temporary presence regression failed:", error.code || error.name); process.exitCode = 1 })
