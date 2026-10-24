const fs = require("node:fs/promises")
const path = require("node:path")
const { parseArgs } = require("node:util")
const { databaseClient } = require("./lib/artist-image-source.cjs")
const { wikipediaClient, discoverContent, planBio, isCalendarBio, digest } = require("./lib/artist-wiki-core.cjs")
const { normalizeName } = require("./lib/artist-image-core.cjs")
const { deploymentOrigin, deploymentBytes } = require("./artist-image-publish.cjs")
const { stableStringify } = require("../lib/wiki-values.cjs")
const ROOT = path.resolve(__dirname, "..")
const MANIFEST = path.join(ROOT, "public", "artist-wiki", "manifest.json")
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char])
const hashValue = value => digest(stableStringify(value))

async function readArtists(ca) {
  const client = await databaseClient(ca)
  try {
    await client.query("BEGIN READ ONLY")
    const { rows } = await client.query('SELECT a.id, a.name, a.slug, a.category, a.image, a.bio, a."bioShort", a.discography, a.members, (SELECT count(*)::int FROM public."Song" s WHERE s."artistId" = a.id) AS "songCount" FROM public."Artist" a ORDER BY a.name, a.id')
    await client.query("COMMIT")
    return rows
  } finally { await client.end() }
}

function hasBio(value) { return typeof value === "string" && value.trim().length > 0 }
function hasDiscography(value) { return Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : value != null }
function summarize(artists) {
  return { total: artists.length, bio: artists.filter(a => hasBio(a.bio)).length, discography: artists.filter(a => hasDiscography(a.discography)).length,
    objectDiscographies: artists.filter(a => Array.isArray(a.discography) && a.discography.some(item => item && typeof item === "object")).length,
    shortBios: artists.filter(a => hasBio(a.bio) && a.bio.length < 200).length }
}

function reviewHtml(report) {
  const cards = report.artists.filter(a => a.proposal).map(a => `<article><h2>${escape(a.name)}</h2><p>${escape(a.proposal.state)} / ${escape(a.proposal.wikidataId)} / ${a.songCount} pesama</p><h3>Trenutni pocetak biografije</h3><p>${escape(a.bio?.slice(0, 500) || "Nedostaje")}</p><h3>Plan</h3><p>${escape(a.changes?.bio?.reason || a.bioReview || "Biografija se cuva")}</p><details><summary>Predlozena biografija</summary><pre>${escape(a.proposal.bio || "Nema potvrdene biografije")}</pre></details><h3>Potvrdeni albumi (${a.proposal.discography?.length || 0})</h3><ul>${(a.proposal.discography || []).map(album => `<li>${escape(album.year)} - ${escape(album.title)} (${escape(album.kind)})</li>`).join("")}</ul>${[a.proposal.bioSource, a.proposal.discographySource].filter(Boolean).map(source => `<p>Wikipedia ${escape(source.language)}: <a href="${escape(source.revisionUrl)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></p>`).join("")}</article>`).join("")
  return `<!doctype html><html lang="sr-Latn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wikipedia pregled izvodjaca</title><style>body{font:16px system-ui;background:#f4f7f9;color:#18232b;margin:0}main{max-width:1050px;margin:auto;padding:20px}article{border-top:1px solid #aab9c2;padding:24px 0}p,li{line-height:1.6;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#075f91}h1{font-size:26px}h2{font-size:22px}h3{font-size:16px}</style><main><h1>Biografije i diskografije: pregled pre upisa</h1><p>Plan nije automatski upisan u bazu. Postojece fotografije, pesme i rucno uredjeni tekstovi se cuvaju. Albumi su preuzeti iz odeljka diskografije, ne iz liste pesama.</p><pre>${escape(JSON.stringify(report.summary, null, 2))}</pre>${cards}</main></html>`
}

async function saveReport(directory, report) {
  await fs.mkdir(directory, { recursive: true })
  report.summary = { ...summarize(report.artists), inspected: report.artists.filter(a => a.proposal).length,
    proposedBios: report.artists.filter(a => a.changes?.bio).length, proposedDiscographies: report.artists.filter(a => a.changes?.discography).length }
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2))
  await fs.writeFile(path.join(directory, "index.html"), reviewHtml(report))
}

async function prepareManifest(report) {
  let manifest = { version: 1, artists: [] }
  try { manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8")) } catch (error) { if (error.code !== "ENOENT") throw error }
  const entries = new Map(manifest.artists.map(a => [a.artistId, a]))
  for (const artist of report.artists) {
    if (!artist.proposal) continue
    const old = entries.get(artist.id)
    if (old) {
      for (const field of ["bio", "discography"]) if (old[field] && old[field].hash !== hashValue(artist[field])) delete old[field]
      if (!old.bio && !old.discography) entries.delete(artist.id)
    }
    if (!Object.keys(artist.changes || {}).length) continue
    const entry = entries.get(artist.id) || { artistId: artist.id, artistName: artist.name, slug: artist.slug, category: artist.category, wikidataId: artist.proposal.wikidataId }
    for (const field of ["bio", "discography"]) {
      if (artist.changes[field]) entry[field] = { hash: hashValue(artist.changes[field].after), ...artist.proposal[field === "bio" ? "bioSource" : "discographySource"] }
    }
    entries.set(artist.id, entry)
  }
  manifest.artists = [...entries.values()].sort((a, b) => a.artistName.localeCompare(b.artistName))
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true })
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n")
  return manifest
}

async function verifySources(baseUrl, manifest) {
  const origin = deploymentOrigin(baseUrl)
  const deployed = JSON.parse((await deploymentBytes(origin + "/artist-wiki/manifest.json")).toString("utf8"))
  if (JSON.stringify(manifest) !== JSON.stringify(deployed)) throw new Error("Deploy current Wikipedia credits first")
  const html = (await deploymentBytes(origin + "/wiki-izvori")).toString("utf8")
  if (!html.includes(`data-artist-wiki-manifest="${hashValue(manifest)}"`)) throw new Error("Wikipedia credits page is not deployed")
}

function reviewedWrong(artist, corrections) { return corrections.some(c => c.name === artist.name && c.beforeHash === hashValue(artist.bio)) }

async function checkedFieldUpdate(client, artist, field, change) {
  if (!["bio", "discography"].includes(field)) throw new Error("Unsupported field")
  const json = field === "discography"
  const previous = json ? `COALESCE("discography", 'null'::jsonb) IS NOT DISTINCT FROM $6::jsonb` : '"bio" IS NOT DISTINCT FROM $6'
  const result = await client.query(`UPDATE public."Artist" SET "${field}" = $1${json ? "::jsonb" : ""} WHERE id = $2 AND name = $3 AND slug IS NOT DISTINCT FROM $4 AND category IS NOT DISTINCT FROM $5 AND ${previous} RETURNING id`,
    [json ? JSON.stringify(change.after) : change.after, artist.id, artist.name, artist.slug, artist.category, json ? JSON.stringify(change.before) : change.before])
  return result.rowCount === 1
}

async function applyChanges(report, ca, { clearOnly = false, fields = ["bio", "discography"], baseUrl, connect = databaseClient, save = async (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2)), mkdir = fs.mkdir, log = console.log, verify = verifySources, loadManifest = async () => JSON.parse(await fs.readFile(MANIFEST, "utf8")) } = {}) {
  if (!fields.length || fields.some(field => !["bio", "discography"].includes(field))) throw new Error("Unsupported field selection")
  const corrections = require("./wiki-reviewed-corrections.json")
  let manifest
  if (!clearOnly) {
    manifest = await loadManifest()
    await verify(baseUrl, manifest)
  }
  const changes = []
  for (const artist of report.artists) {
    if (clearOnly) {
      if (isCalendarBio(artist.bio) || reviewedWrong(artist, corrections)) changes.push({ artist, field: "bio", before: artist.bio, after: null, reason: "Reviewed wrong subject/calendar" })
    } else for (const [field, change] of Object.entries(artist.changes || {})) {
      if (!["bio", "discography"].includes(field)) throw new Error("Unsupported field")
      if (!fields.includes(field)) continue
      if (field === "discography" && require("./wiki-discography-holds.json").some(item =>
        item.wikidataId === artist.proposal?.wikidataId && normalizeName(item.name) === normalizeName(artist.name))) throw new Error("Discography requires manual review")
      const credit = manifest.artists.find(a => a.artistId === artist.id)?.[field]
      if (!["bio", "discography"].includes(field) || !credit || credit.hash !== hashValue(change.after)) throw new Error("Plan does not match published attribution")
      if (field === "bio" && !hasBio(change.after) || field === "discography" && (!Array.isArray(change.after) || !change.after.length)) throw new Error("Refusing an empty replacement")
      if (field === "discography" && change.after.some(album => album.kind !== "studio" || typeof album.title !== "string" || !album.title.trim() || !/^(?:19|20)\d{2}$/.test(album.year) || Number(album.year) > new Date().getUTCFullYear())) throw new Error("Only confirmed studio albums may be imported automatically")
      changes.push({ artist, field, ...change })
    }
  }
  if (!changes.length) { log("No eligible changes."); return { updated: [], skipped: [] } }
  const directory = path.join(ROOT, "reports", "artist-wiki", "apply-" + new Date().toISOString().replace(/[:.]/g, "-"))
  await mkdir(directory, { recursive: true })
  const client = await connect(ca)
  let committed = false
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL lock_timeout = '5s'")
    const before = await client.query('SELECT id, name, slug, category, bio, "bioShort", discography, image, members FROM public."Artist" WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE', [[...new Set(changes.map(c => c.artist.id))]])
    await save(path.join(directory, "before.json"), { createdAt: new Date().toISOString(), artists: before.rows, changes })
    const updated = [], skipped = []
    for (const change of changes) (await checkedFieldUpdate(client, change.artist, change.field, change) ? updated : skipped).push({ id: change.artist.id, name: change.artist.name, field: change.field })
    await save(path.join(directory, "intent.json"), { updated, skipped, state: "not-yet-committed" })
    await client.query("COMMIT"); committed = true
    await save(path.join(directory, "result.json"), { updated, skipped, state: "committed" })
    log(JSON.stringify({ updated, skipped, backup: directory }))
    return { updated, skipped }
  } catch (error) { if (!committed) await client.query("ROLLBACK").catch(() => {}); throw error }
  finally { await client.end() }
}

async function main(args = process.argv.slice(2)) {
  const { positionals, values } = parseArgs({ args, allowPositionals: true, options: { ca: { type: "string" }, "report-dir": { type: "string" }, report: { type: "string", multiple: true }, field: { type: "string", multiple: true }, limit: { type: "string", default: "100" }, name: { type: "string", multiple: true }, "base-url": { type: "string" }, apply: { type: "boolean", default: false }, balanced: { type: "boolean", default: false }, "min-songs": { type: "string", default: "0" }, "exclude-report": { type: "string", multiple: true } } })
  const command = positionals[0] || "audit"
  if (positionals.length > 1 || !["audit", "plan", "combine", "apply", "clear-reviewed"].includes(command)) throw new Error("Use audit, plan, combine, apply or clear-reviewed")
  if (values.field && (command !== "apply" || values.field.some(field => !["bio", "discography"].includes(field)))) throw new Error("Use --field bio or --field discography with apply")
  for (const file of [".env.local", ".env"]) require("dotenv").config({ path: path.join(ROOT, file), quiet: true })
  if (command === "combine") {
    if (!values.report?.length) throw new Error("--report is required")
    const artists = new Map()
    for (const file of values.report) {
      const report = JSON.parse(await fs.readFile(path.resolve(file), "utf8"))
      if (report.source !== "live-database") throw new Error("A live plan is required")
      for (const artist of report.artists) if (!artists.has(artist.id) || artist.proposal) artists.set(artist.id, artist)
    }
    const report = { version: 1, createdAt: new Date().toISOString(), source: "live-database", artists: [...artists.values()] }
    const directory = path.resolve(ROOT, values["report-dir"] || "reports/artist-wiki/ready")
    await prepareManifest(report); await saveReport(directory, report)
    console.log("Combined plan:", JSON.stringify(report.summary)); console.log(path.join(directory, "index.html"))
    return report
  }
  if (["apply", "clear-reviewed"].includes(command)) {
    if (values.report?.length !== 1) throw new Error("Exactly one --report is required")
    const report = JSON.parse(await fs.readFile(path.resolve(values.report[0]), "utf8"))
    if (report.source !== "live-database") throw new Error("A live audit/plan is required")
    if (!values.apply) { console.log("No writes: --apply is required."); return }
    return applyChanges(report, values.ca, { clearOnly: command === "clear-reviewed", fields: values.field, baseUrl: values["base-url"] })
  }
  const artists = await readArtists(values.ca)
  const report = { version: 1, createdAt: new Date().toISOString(), source: "live-database", summary: summarize(artists), artists }
  const directory = path.resolve(ROOT, values["report-dir"] || `reports/artist-wiki/${command === "plan" ? "first-plan" : "current-audit"}`)
  await saveReport(directory, report)
  console.log("Read-only audit:", JSON.stringify(report.summary))
  if (command === "plan") {
    const limit = Number(values.limit)
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("Limit must be 1..200")
    const wanted = values.name?.map(normalizeName)
    const attempted = new Set()
    for (const file of values["exclude-report"] || []) for (const a of JSON.parse(await fs.readFile(path.resolve(file), "utf8")).artists) if (a.proposal) attempted.add(a.id)
    const minSongs = Number(values["min-songs"])
    if (!Number.isInteger(minSongs) || minSongs < 0) throw new Error("Invalid minimum song count")
    const sorted = [...artists].filter(a => !attempted.has(a.id) && a.songCount >= minSongs && (!wanted || wanted.includes(normalizeName(a.name)))).sort((a, b) => b.songCount - a.songCount)
    let selected = sorted.slice(0, limit)
    if (values.balanced && !wanted) {
      selected = []
      const groups = ["domace", "narodne", "strane"].map(category => sorted.filter(a => a.category === category))
      for (let index = 0; selected.length < limit && groups.some(group => index < group.length); index++) for (const group of groups) if (group[index] && selected.length < limit) selected.push(group[index])
    }
    const corrections = require("./wiki-reviewed-corrections.json")
    const client = wikipediaClient(path.join(ROOT, "reports", "artist-images", "cache"))
    for (const [index, artist] of selected.entries()) {
      console.log(`[${index + 1}/${selected.length}] ${artist.name}`)
      try {
        artist.proposal = await discoverContent(artist, client)
        artist.changes = {}
        const bio = planBio(artist.bio, artist.proposal.bio, reviewedWrong(artist, corrections))
        artist.bioReview = bio.reason
        if (bio.action === "replace") artist.changes.bio = { before: artist.bio, after: bio.value, reason: bio.reason }
        if (!hasDiscography(artist.discography) && artist.proposal.discography?.length) artist.changes.discography = { before: artist.discography, after: artist.proposal.discography, reason: "Missing confirmed album list" }
      } catch (error) { artist.proposal = { state: error.status ? `http-${error.status}` : "request-failed" } }
      if ((index + 1) % 10 === 0 || index === selected.length - 1) await saveReport(directory, report)
      console.log("  ->", artist.proposal.state, Object.keys(artist.changes || {}).join(",") || "preserved")
    }
    const manifest = await prepareManifest(report)
    console.log("Prepared source credits:", manifest.artists.length)
  }
  console.log("Report:", path.join(directory, "index.html"))
  return report
}
if (require.main === module) main().catch(error => {
  const safe = new Set(["Deploy current Wikipedia credits first", "Wikipedia credits page is not deployed", "Deployment asset unavailable", "Plan does not match published attribution", "Only confirmed studio albums may be imported automatically"])
  console.error("Artist Wikipedia maintenance stopped:", safe.has(error.message) ? error.message : error.code || error.name, "/ credentials are not logged")
  process.exitCode = 1
})
module.exports = { main, readArtists, summarize, hasBio, hasDiscography, hashValue, reviewedWrong, checkedFieldUpdate, applyChanges, reviewHtml }
