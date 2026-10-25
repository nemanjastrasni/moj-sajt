/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in CommonJS schema setup. */
const fs = require("node:fs/promises")
const path = require("node:path")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { databaseClient } = require("./lib/artist-image-source.cjs")
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, apply: { type: "boolean", default: false } } })
  const root = path.resolve(__dirname, "..")
  loadEnvConfig(root)
  const client = await databaseClient(values.ca)
  try {
    await client.query(values.apply ? "BEGIN" : "BEGIN READ ONLY")
    await client.query("SET LOCAL lock_timeout = '5s'")
    const before = (await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='online_presence' ORDER BY ordinal_position")).rows
    const existing = before.find(column => column.column_name === "country_code")
    if (existing && existing.data_type !== "text") throw Error("Unexpected country_code type")
    if (!values.apply) { await client.query("ROLLBACK"); console.log(JSON.stringify({ apply: false, hasPresenceTable: before.length > 0, countryColumnExists: Boolean(existing), plannedChange: "Add nullable country_code TEXT only; no user/song/playlist changes" })); return }
    const directory = path.join(root, "reports/presence")
    await fs.mkdir(directory, { recursive: true })
    const backup = path.join(directory, `setup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
    await fs.writeFile(backup, JSON.stringify({ beforeColumns: before, change: "Add nullable country_code TEXT; create presence table/index only if missing", containsVisitorOrAccountData: false }, null, 2), { flag: "wx" })
    await client.query(await fs.readFile(path.join(root, "prisma/sql/online-presence.sql"), "utf8"))
    await client.query("COMMIT")
    console.log(JSON.stringify({ applied: true, countryColumnPreviouslyExisted: Boolean(existing), backup, userSongPlaylistChanges: 0 }))
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error }
  finally { await client.end() }
}
main().catch(error => { console.error("Presence setup stopped:", error.code || error.name); process.exitCode = 1 })
