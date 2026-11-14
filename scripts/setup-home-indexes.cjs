/* eslint-disable @typescript-eslint/no-require-imports -- Explicit, additive concurrent index setup; default is read-only inspection. */
const fs = require("node:fs/promises"), path = require("node:path"), { parseArgs } = require("node:util")
const definitions = [
  { name: "Song_home_popular_idx", first: "popularity", second: "id", firstOrder: 3, secondOrder: 0 },
  { name: "Song_home_latest_idx", first: "createdAt", second: "id", firstOrder: 1, secondOrder: 3 },
]
const catalog = `SELECT i.relname AS name,x.indisvalid AS valid,x.indisready AS ready,am.amname AS method,
  a.attname AS first,b.attname AS second,x.indoption[0]::int AS "firstOrder",x.indoption[1]::int AS "secondOrder",
  x.indnkeyatts AS keys,x.indpred IS NOT NULL AS partial,x.indexprs IS NOT NULL AS expression
  FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid
  JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_am am ON am.oid=i.relam
  LEFT JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=x.indkey[0]
  LEFT JOIN pg_attribute b ON b.attrelid=t.oid AND b.attnum=x.indkey[1]
  WHERE n.nspname='public' AND t.relname='Song'`
const matches = (row, def) => row.method === "btree" && row.keys === 2 && !row.partial && !row.expression && ["first", "second", "firstOrder", "secondOrder"].every(key => row[key] === def[key])
async function setupHomeIndexes(db, { apply = false } = {}) {
  const rows = (await db.query(catalog)).rows
  for (const def of definitions) {
    const named = rows.find(row => row.name === def.name)
    if (named && (!named.valid || !named.ready || !matches(named, def))) throw Error("Existing index requires inspection: " + def.name)
  }
  const pending = definitions.filter(def => !rows.some(row => row.valid && row.ready && matches(row, def)))
  const report = { apply, existing: definitions.filter(def => !pending.includes(def)).map(def => def.name), missing: pending.map(def => def.name), created: [] }
  if (!apply || !pending.length) return report
  await db.query("SET lock_timeout='3s'")
  await db.query("SET statement_timeout='60s'")
  const sql = await fs.readFile(path.join(__dirname, "../prisma/sql/home-performance.sql"), "utf8")
  const statements = sql.split(";").map(value => value.replace(/^--[^\n]*\n/gm, "").trim()).filter(Boolean)
  if (statements.length !== definitions.length || statements.some(statement => !statement.startsWith("CREATE INDEX CONCURRENTLY IF NOT EXISTS"))) throw Error("Unexpected home index manifest")
  for (const def of pending) {
    const statement = statements.find(sql => sql.includes('"' + def.name + '"'))
    if (!statement) throw Error("Missing index definition: " + def.name)
    await db.query(statement)
    const row = (await db.query(catalog)).rows.find(row => row.name === def.name)
    if (!row || !row.valid || !row.ready || !matches(row, def)) throw Error("New index requires inspection: " + def.name)
    report.created.push(def.name)
  }
  report.missing = []
  return report
}
async function main() {
  const { values } = parseArgs({ options: { apply: { type: "boolean", default: false }, ca: { type: "string" } } })
  require("@next/env").loadEnvConfig(path.resolve(__dirname, ".."), false, { info() {}, error() {} })
  const db = await require("./lib/artist-image-source.cjs").databaseClient(values.ca)
  try { console.log(JSON.stringify(await setupHomeIndexes(db, { apply: values.apply }), null, 2)) } finally { await db.end() }
}
module.exports = { setupHomeIndexes, definitions, matches }
if (require.main === module) main().catch(error => { console.error("Home index setup stopped:", error.code || error.message); process.exitCode = 1 })
