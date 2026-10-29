/* eslint-disable @typescript-eslint/no-require-imports -- Read-only verified database search audit. */
const path = require("node:path"), Module = require("node:module"), assert = require("node:assert/strict"), { parseArgs } = require("node:util")
const ROOT = path.resolve(__dirname, "..")
require("@next/env").loadEnvConfig(ROOT)
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const original = Module._load
Module._load = function(request, parent, isMain) { if (request.startsWith("@/")) request = path.join(ROOT, request.slice(2)); return original.call(this, request, parent, isMain) }
let normalizedSearchQuery, foldedSearchSql
try { ({ normalizedSearchQuery, foldedSearchSql } = require("../lib/songSearchServer.ts")) } finally { Module._load = original }
const { prepareSongQuery } = require("../lib/songSearch.ts"), { Prisma } = require("@prisma/client")
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" } } }), db = await require("./lib/artist-image-source.cjs").databaseClient(values.ca)
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const sample = Prisma.sql`SELECT ${foldedSearchSql(Prisma.sql`${"\u017deljko \u0110or\u0111e \u010c\u0106\u0160\u017d"}`)} AS folded`
    assert.equal((await db.query(sample.text, sample.values)).rows[0].folded, "zeljko djordje ccsz")
    const results = []
    for (const variants of [["Zeljko", "\u017deljko", "ZELJKO"], ["Djordje", "\u0110or\u0111e"], ["Saban", "\u0160aban"], ["Ruzo", "Ru\u017eo"]]) {
      let ids
      for (const query of variants) {
        const sql = normalizedSearchQuery(prepareSongQuery(query)), started = Date.now(), rows = (await db.query(sql.text, sql.values)).rows
        assert.ok(rows.length > 0 && rows.length <= 12)
        assert.ok(rows.every(row => !Object.hasOwn(row, "lyrics") && !Object.hasOwn(row, "email")))
        if (ids) assert.deepEqual(rows.map(row => row.id), ids); else ids = rows.map(row => row.id)
        results.push({ query, count: rows.length, elapsedMs: Date.now() - started, artists: [...new Set(rows.map(row => row.artist.name))].slice(0, 3) })
      }
    }
    await db.query("ROLLBACK")
    console.log(JSON.stringify({ readOnly: true, variantsAgree: true, results }, null, 2))
  } finally { await db.end() }
}
main().catch(error => { console.error("Read-only search audit failed:", error.code || error.message); process.exitCode = 1 })
