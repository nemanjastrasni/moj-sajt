/* eslint-disable @typescript-eslint/no-require-imports -- Database maintenance uses existing CommonJS CLI helpers. */
const fs = require("node:fs/promises")
const path = require("node:path")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { databaseClient } = require("./lib/artist-image-source.cjs")
const ROOT = path.resolve(__dirname, "..")
const digestSql = `SELECT count(*)::int AS count, md5(string_agg(md5(json_build_array(id, lyrics, chords)::text), '' ORDER BY id)) AS hash FROM public."Song"`
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, apply: { type: "boolean", default: false } } })
  loadEnvConfig(ROOT)
  const client = await databaseClient(values.ca)
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query('LOCK TABLE public."Song" IN SHARE ROW EXCLUSIVE MODE')
    const exists = Boolean((await client.query("SELECT to_regclass('public.\"SongReview\"') AS name")).rows[0].name)
    let reviews = []
    if (exists) {
      const columns = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='SongReview' ORDER BY column_name")).rows.map(row => row.column_name)
      if (columns.join(",") !== "reviewedById,songId,status,updatedAt") throw Error("Unexpected existing review table; inspect manually")
      reviews = (await client.query('SELECT * FROM public."SongReview" ORDER BY "songId"')).rows
      if (reviews.some(row => !["unreviewed", "needs_fix", "verified"].includes(row.status))) throw Error("Unexpected existing review statuses")
    }
    const before = (await client.query(digestSql)).rows[0]
    if (!values.apply) {
      await client.query("ROLLBACK")
      console.log(JSON.stringify({ mode: "dry-run", alreadyExists: exists, songs: before.count, existingReviews: reviews.length, implicitUnreviewed: before.count - reviews.length }))
      return
    }
    const backup = path.join(ROOT, "reports/song-reviews", "setup-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json")
    await fs.mkdir(path.dirname(backup), { recursive: true })
    await fs.writeFile(backup, JSON.stringify({ hadTable: exists, songDigest: before, reviews }, null, 2), { flag: "wx" })
    await client.query(await fs.readFile(path.join(ROOT, "prisma/sql/song-review.sql"), "utf8"))
    const after = (await client.query(digestSql)).rows[0]
    const afterReviews = (await client.query('SELECT * FROM public."SongReview" ORDER BY "songId"')).rows
    if (JSON.stringify(before) !== JSON.stringify(after) || JSON.stringify(reviews) !== JSON.stringify(afterReviews)) throw Error("Content/review preservation verification failed")
    const policies = (await client.query("SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public' AND tablename='SongReview'")).rows[0].count
    if (policies) throw Error("Unexpected public review access policies; inspect manually")
    await client.query("COMMIT")
    console.log(JSON.stringify({ mode: "applied", songsPreserved: after.count, existingReviewsPreserved: reviews.length, automaticallyVerified: 0, backup }))
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("Review setup failed and was rolled back:", error.code || "Verification failed")
    process.exitCode = 1
  } finally { await client.end() }
}
main().catch(() => { console.error("Could not connect securely. No change was applied."); process.exitCode = 1 })
