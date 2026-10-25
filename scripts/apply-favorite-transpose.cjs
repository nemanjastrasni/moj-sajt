/* eslint-disable @typescript-eslint/no-require-imports -- Explicit, backed-up database maintenance CLI. */
const fs = require("node:fs/promises"), path = require("node:path")
const { createHash } = require("node:crypto")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { databaseClient } = require("./lib/artist-image-source.cjs")
const ROOT = path.resolve(__dirname, "..")
const hash = rows => createHash("sha256").update(JSON.stringify(rows.map(row => ({ id: row.id, userId: row.userId, songId: row.songId, createdAt: row.createdAt })))).digest("hex")
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, apply: { type: "boolean", default: false } } })
  loadEnvConfig(ROOT)
  const client = await databaseClient(values.ca)
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query('LOCK TABLE public."Favorite" IN SHARE ROW EXCLUSIVE MODE')
    const column = (await client.query("SELECT column_default, is_nullable, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='Favorite' AND column_name='transpose'")).rows[0]
    if (column && (column.data_type !== "integer" || column.is_nullable !== "NO" || column.column_default !== "0")) throw Error("Unexpected existing transpose column")
    const before = (await client.query('SELECT id, "userId", "songId", "createdAt"' + (column ? ', transpose' : '') + ' FROM public."Favorite" ORDER BY id')).rows
    if (!values.apply) {
      await client.query("ROLLBACK")
      console.log(JSON.stringify({ mode: "dry-run", alreadyApplied: Boolean(column), favorites: before.length, metadataHash: hash(before) }))
      return
    }
    const backup = path.join(ROOT, "reports/songbook/favorite-transpose-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json")
    await fs.mkdir(path.dirname(backup), { recursive: true })
    await fs.writeFile(backup, JSON.stringify({ createdAt: new Date().toISOString(), hadColumn: Boolean(column), metadataHash: hash(before), favorites: before.map(row => ({ id: row.id, ...(column ? { transpose: row.transpose } : {}) })) }, null, 2), { flag: "wx" })
    await client.query(await fs.readFile(path.join(ROOT, "prisma/sql/favorite-transpose.sql"), "utf8"))
    const after = (await client.query('SELECT id, "userId", "songId", "createdAt", transpose FROM public."Favorite" ORDER BY id')).rows
    if (before.length !== after.length || hash(before) !== hash(after) || after.some((row, index) => row.transpose !== (column ? before[index].transpose : 0))) throw Error("Favorite preservation verification failed")
    await client.query("COMMIT")
    console.log(JSON.stringify({ mode: "applied", alreadyApplied: Boolean(column), preservedFavorites: after.length, backup }))
  } catch (cause) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("Favorite transpose setup failed and was rolled back:", cause.code || "verification failed")
    process.exitCode = 1
  } finally { await client.end() }
}
main().catch(() => { console.error("Could not connect securely. No change was applied."); process.exitCode = 1 })
