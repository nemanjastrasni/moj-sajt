/* eslint-disable @typescript-eslint/no-require-imports -- Database maintenance uses the existing CommonJS CLI helpers. */
const fs = require("node:fs/promises")
const path = require("node:path")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { databaseClient } = require("./lib/artist-image-source.cjs")
const ROOT = path.resolve(__dirname, "..")

async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, apply: { type: "boolean", default: false } } })
  loadEnvConfig(ROOT)
  const client = await databaseClient(values.ca)
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query('LOCK TABLE public."Playlist" IN SHARE ROW EXCLUSIVE MODE')
    const column = (await client.query("SELECT column_default, is_nullable, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='Playlist' AND column_name='isPublic'")).rows[0]
    if (column && (column.data_type !== "boolean" || column.is_nullable !== "NO" || column.column_default !== "false")) throw new Error("Unexpected existing privacy column; inspect manually before changing anything")
    const before = (await client.query('SELECT id, "isAdmin"' + (column ? ', "isPublic"' : '') + ' FROM public."Playlist" ORDER BY id')).rows
    const links = (await client.query('SELECT count(*)::int AS count FROM public."PlaylistSong"')).rows[0].count
    if (!values.apply) {
      await client.query("ROLLBACK")
      console.log(JSON.stringify({ mode: "dry-run", alreadyApplied: Boolean(column), playlists: before.length, songLinks: links, personalStartPrivate: !column ? before.filter(row => !row.isAdmin).length : 0 }))
      return
    }
    const backup = path.join(ROOT, "reports", "songbook", "playlist-privacy-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json")
    await fs.mkdir(path.dirname(backup), { recursive: true })
    await fs.writeFile(backup, JSON.stringify({ createdAt: new Date().toISOString(), hadColumn: Boolean(column), playlists: before, songLinks: links }, null, 2), { flag: "wx" })
    await client.query(await fs.readFile(path.join(ROOT, "prisma/sql/playlist-privacy.sql"), "utf8"))
    const after = (await client.query('SELECT id, "isAdmin", "isPublic" FROM public."Playlist" ORDER BY id')).rows
    if (after.length !== before.length || after.some((row, index) => row.id !== before[index].id || row.isAdmin !== before[index].isAdmin || row.isPublic !== (column ? before[index].isPublic : before[index].isAdmin))) throw new Error("Privacy verification failed")
    if ((await client.query('SELECT count(*)::int AS count FROM public."PlaylistSong"')).rows[0].count !== links) throw new Error("Song-link verification failed")
    await client.query("COMMIT")
    console.log(JSON.stringify({ mode: "applied", alreadyApplied: Boolean(column), playlists: after.length, private: after.filter(row => !row.isPublic).length, public: after.filter(row => row.isPublic).length, preservedSongLinks: links, backup }))
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    // Do not print connection strings or unredacted database errors.
    console.error("Privacy setup failed and was rolled back:", error.code || error.message?.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]"))
    process.exitCode = 1
  } finally { await client.end() }
}
main().catch(() => { console.error("Could not connect securely to the configured database. No change was applied."); process.exitCode = 1 })
