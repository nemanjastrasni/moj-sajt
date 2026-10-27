const fs = require("node:fs/promises")
const path = require("node:path")
const { parseArgs } = require("node:util")
const { LANGUAGES, extractArticle, wikipediaClient } = require("./lib/artist-wiki-core.cjs")
const { normalizeName } = require("./lib/artist-image-core.cjs")
const { readArtists, hashValue } = require("./artist-wiki.cjs")
const holds = require("./wiki-discography-holds.json")

function publishedReport(report, live, manifest) {
  const artists = [], preserved = []
  for (const current of live) {
    if (!Array.isArray(current.discography) || !current.discography.length) continue
    const original = report.artists.find(artist => artist.id === current.id)
    const credit = manifest.artists.find(artist => artist.artistId === current.id)
    if (!original?.proposal || !credit?.discography || credit.discography.hash !== hashValue(current.discography) ||
      ["name", "slug", "category"].some(key => original[key] !== current[key]) || credit.wikidataId !== original.proposal.wikidataId) {
      preserved.push({ id: current.id, name: current.name, reason: "Untracked/manual or changed identity; preserved" }); continue
    }
    const source = { ...credit.discography }
    delete source.hash
    artists.push({ ...current, proposal: { ...original.proposal, discographySource: source },
      changes: { discography: { before: current.discography, after: current.discography, reason: "Recheck published list against pinned source with corrected parser" } } })
  }
  return { ...report, artists, preserved }
}

async function recheck(report, live, readPinned) {
  const unchanged = [], revised = [], skipped = []
  for (const artist of report.artists) {
    const change = artist.changes?.discography
    if (!change) continue
    const current = live.find(item => item.id === artist.id)
    const source = artist.proposal?.discographySource
    const hold = holds.find(item => item.wikidataId === artist.proposal?.wikidataId && normalizeName(item.name) === normalizeName(artist.name))
    if (!current || ["name", "slug", "category"].some(key => current[key] !== artist[key]) ||
      hashValue(current.discography) !== hashValue(change.before)) {
      skipped.push({ id: artist.id, name: artist.name, reason: "Live identity or discography changed; preserved" }); continue
    }
    if (hold) { skipped.push({ id: artist.id, name: artist.name, reason: hold.reason }); continue }
    if (!source || !LANGUAGES.includes(source.language) || !Number.isInteger(source.revisionId) || source.revisionId < 1 || !/^Q\d+$/.test(artist.proposal.wikidataId || "")) throw new Error("Invalid pinned source")
    const html = await readPinned(source)
    const albums = extractArticle(html, { subjectKind: artist.proposal.evidence }).albums.filter(album => album.kind === "studio")
    if (!albums.length) { skipped.push({ id: artist.id, name: artist.name, reason: "No unambiguous studio albums after corrected parsing" }); continue }
    const entry = { ...artist, changes: { discography: { ...change, after: albums } },
      proposal: { ...artist.proposal, discography: albums } }
    ;(hashValue(albums) === hashValue(change.after) ? unchanged : revised).push(entry)
  }
  const wrap = artists => ({ version: 1, createdAt: new Date().toISOString(), source: "live-database", artists })
  return { unchanged: wrap(unchanged), revised: wrap(revised), skipped }
}

async function main() {
  const { values } = parseArgs({ options: { report: { type: "string" }, ca: { type: "string" }, out: { type: "string" }, published: { type: "boolean", default: false } } })
  if (!values.report || !values.out) throw new Error("Use --report, --ca and --out")
  const root = path.resolve(__dirname, "..")
  for (const file of [".env.local", ".env"]) require("dotenv").config({ path: path.join(root, file), quiet: true })
  let report = JSON.parse(await fs.readFile(path.resolve(values.report), "utf8"))
  if (report.source !== "live-database") throw new Error("Live report required")
  const client = wikipediaClient(path.join(root, "reports/artist-images/cache"))
  const live = await readArtists(values.ca)
  if (values.published) report = publishedReport(report, live, JSON.parse(await fs.readFile(path.join(root, "public/artist-wiki/manifest.json"), "utf8")))
  const results = await recheck(report, live, async source => {
    const parsed = await client.json(`https://${source.language}.wikipedia.org/w/api.php?` + new URLSearchParams({ action: "parse", oldid: String(source.revisionId), prop: "text|revid", format: "json", formatversion: "2" }))
    if (parsed.parse?.revid !== source.revisionId || typeof parsed.parse?.text !== "string") throw new Error("Pinned revision mismatch")
    return parsed.parse.text
  })
  if (values.published) results.preserved = report.preserved
  const out = path.resolve(values.out)
  await fs.mkdir(out, { recursive: true })
  for (const [name, value] of Object.entries(results)) await fs.writeFile(path.join(out, name + ".json"), JSON.stringify(value, null, 2))
  console.log(JSON.stringify({ unchanged: results.unchanged.artists.length, revised: results.revised.artists.length, skipped: results.skipped.length, out }))
  console.log("Read-only: unchanged can use existing deployed credits; revised requires new credits/deployment. No database writes.")
}
if (require.main === module) main().catch(error => { console.error(error.code || error.message); process.exitCode = 1 })
module.exports = { recheck, publishedReport }
