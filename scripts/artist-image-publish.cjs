const fs = require("node:fs/promises")
const path = require("node:path")
const sharp = require("sharp")
const { parseArgs } = require("node:util")
const { databaseClient, readDatabase } = require("./lib/artist-image-source.cjs")
const { digest, normalizeName, safeWikiUrl, isArtistPhoto } = require("./lib/artist-image-core.cjs")

const ROOT = path.resolve(__dirname, "..")
const ASSETS = path.join(ROOT, "public", "artist-photos")
const MANIFEST = path.join(ASSETS, "manifest.json")
const CHANGES = "EXIF orientation corrected where present; resized without cropping or enlargement; converted to WebP."

async function saveJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = file + "." + process.pid + ".tmp"
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx" })
  await fs.rename(temporary, file)
}

function eligible(item, current, minSongs) {
  const candidate = item.candidate
  return Boolean(current && !current.image?.trim() && current.id === item.id &&
    current.name === item.name && current.slug === item.slug && current.category === item.category &&
    (current.songCount ?? 0) >= minSongs && candidate?.state === "review-ready" &&
    ["musician", "musical-group"].includes(candidate.evidence) &&
    normalizeName(candidate.label || "") === normalizeName(current.name) &&
    /^Q\d{1,15}$/.test(candidate.wikidataId) && candidate.photo?.allowed &&
    candidate.photo.author?.trim() && !candidate.photo.restrictions?.trim() &&
    !/unknown author|anonymous|nepoznat/i.test(candidate.photo.author) &&
    isArtistPhoto(candidate.photo) &&
    /^staged\/Q\d+-[a-f0-9]{16}\.webp$/.test(candidate.stagedFile || ""))
}

async function prepare(reportFiles, ca, minSongs, skipNames = []) {
  if (!reportFiles.length) throw new Error("At least one --report is required")
  const loaded = await readDatabase(ca)
  const live = new Map(loaded.artists.map(item => [item.id, item]))
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"))
  const known = new Map(manifest.photos.map(item => [item.artistId, item]))
  let added = 0
  const holds = require("./artist-photo-holds.json")
  const skippedNames = new Set([...holds.map(item => item.name), ...skipNames].map(normalizeName))
  for (const reportFile of reportFiles) {
    const report = JSON.parse(await fs.readFile(reportFile, "utf8"))
    if (report.source?.kind !== "database") throw new Error("Cannot publish from a snapshot")
    for (const item of report.artists) {
      if (known.has(item.id) || skippedNames.has(normalizeName(item.name)) || !eligible(item, live.get(item.id), minSongs)) continue
      const candidate = item.candidate, photo = candidate.photo
      safeWikiUrl(photo.filePage)
      safeWikiUrl(candidate.entityUrl)
      const staged = path.resolve(path.dirname(reportFile), candidate.stagedFile)
      const realDirectory = await fs.realpath(path.join(path.dirname(reportFile), "staged"))
      if (path.dirname(await fs.realpath(staged)) !== realDirectory) throw new Error("Staged symlink escapes directory")
      const bytes = await fs.readFile(staged)
      const sha256 = digest(bytes)
      const filename = path.basename(staged)
      if (filename !== `${candidate.wikidataId}-${sha256.slice(0, 16)}.webp`) throw new Error("Staged image checksum mismatch")
      const metadata = await sharp(bytes, { limitInputPixels: 40000000 }).metadata()
      if (metadata.format !== "webp" || metadata.width < 160 || metadata.height < 160) continue
      await fs.mkdir(ASSETS, { recursive: true })
      await fs.writeFile(path.join(ASSETS, filename), bytes, { flag: "wx" }).catch(async error => {
        if (error.code !== "EEXIST" || digest(await fs.readFile(path.join(ASSETS, filename))) !== sha256) throw error
      })
      const entry = {
        artistId: item.id, artistName: item.name, slug: item.slug, category: item.category,
        image: "/artist-photos/" + filename, sha256, width: metadata.width, height: metadata.height,
        wikidataId: candidate.wikidataId, entityUrl: candidate.entityUrl,
        title: decodeURIComponent(new URL(photo.filePage).pathname.split("/wiki/File:")[1] || filename).replace(/_/g, " "),
        author: photo.author, credit: photo.credit, license: photo.license, licenseUrl: photo.licenseUrl,
        source: photo.filePage, changes: CHANGES,
      }
      manifest.photos.push(entry); known.set(item.id, entry); added++
    }
  }
  manifest.photos.sort((a, b) => a.artistName.localeCompare(b.artistName))
  await saveJson(MANIFEST, manifest)
  console.log(`Prepared ${added} additional photos; manifest total ${manifest.photos.length}. No database writes.`)
  return manifest
}

function deploymentOrigin(value) {
  const url = new URL(value)
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash ||
    !(url.hostname.endsWith(".vercel.app") || ["gitarakordi.com", "www.gitarakordi.com"].includes(url.hostname))) throw new Error("Use the public Vercel or GitaraAkordi HTTPS origin")
  return url.origin
}

async function deploymentBytes(url, request = fetch) {
  const response = await request(url, { redirect: "error", signal: AbortSignal.timeout(15000), cache: "no-store" })
  if (!response.ok) { await response.body?.cancel(); throw new Error("Deployment asset unavailable") }
  const chunks = []; let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > 12000000) throw new Error("Deployment response exceeds limit")
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function verifyDeployment(manifest, baseUrl, request = fetch) {
  const origin = deploymentOrigin(baseUrl)
  const deployed = JSON.parse((await deploymentBytes(origin + "/artist-photos/manifest.json", request)).toString("utf8"))
  if (JSON.stringify(deployed) !== JSON.stringify(manifest)) throw new Error("Deploy the current photo manifest before updating the database")
  const credits = (await deploymentBytes(origin + "/foto-izvori", request)).toString("utf8")
  if (!credits.includes(`data-artist-photo-manifest="${digest(JSON.stringify(manifest))}"`)) throw new Error("Photo credits are not deployed")
  for (const photo of manifest.photos) {
    if (!/^\/artist-photos\/Q\d+-[a-f0-9]{16}\.webp$/.test(photo.image)) throw new Error("Invalid public image path")
    if (digest(await fs.readFile(path.join(ROOT, "public", photo.image.slice(1)))) !== photo.sha256) throw new Error("Local image checksum mismatch")
    if (digest(await deploymentBytes(origin + photo.image, request)) !== photo.sha256) throw new Error("Deployed image checksum mismatch")
  }
}

async function checkedUpdate(client, photo) {
  const result = await client.query('UPDATE public."Artist" SET image = $1 WHERE id = $2 AND name = $3 AND slug IS NOT DISTINCT FROM $4 AND category IS NOT DISTINCT FROM $5 AND (image IS NULL OR btrim(image) = \'\') RETURNING id',
    [photo.image, photo.artistId, photo.artistName, photo.slug, photo.category])
  return result.rowCount === 1
}

async function publish(manifest, ca, baseUrl, { verify = verifyDeployment, connect = databaseClient, save = saveJson, root = ROOT, log = console.log } = {}) {
  if (manifest.version !== 1 || !manifest.photos.length || manifest.photos.length > 200) throw new Error("Invalid or oversized publication manifest")
  if (new Set(manifest.photos.map(item => item.artistId)).size !== manifest.photos.length) throw new Error("Duplicate artist identities")
  // Validate public availability and visible attribution before the first database write.
  await verify(manifest, baseUrl)
  const directory = path.join(root, "reports", "artist-images", "publish-" + new Date().toISOString().replace(/[:.]/g, "-"))
  const client = await connect(ca)
  let committed = false
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL lock_timeout = '5s'")
    const before = await client.query('SELECT id, name, slug, category, image FROM public."Artist" WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE', [manifest.photos.map(item => item.artistId)])
    await save(path.join(directory, "before.json"), { createdAt: new Date().toISOString(), artists: before.rows, manifest })
    const updated = [], skipped = []
    for (const photo of manifest.photos) (await checkedUpdate(client, photo) ? updated : skipped).push(photo.artistId)
    await save(path.join(directory, "intent.json"), { updated, skipped, state: "transaction-not-yet-committed" })
    await client.query("COMMIT"); committed = true
    await save(path.join(directory, "result.json"), { updated, skipped, state: "committed" })
    log(`Committed ${updated.length} missing photos; preserved/skipped ${skipped.length}. Backup: ${directory}`)
    return { updated, skipped }
  } catch (error) {
    if (!committed) await client.query("ROLLBACK").catch(() => {})
    throw error
  } finally { await client.end() }
}

async function main(args = process.argv.slice(2)) {
  const { positionals, values } = parseArgs({ args, allowPositionals: true, options: {
    report: { type: "string", multiple: true }, ca: { type: "string" }, "min-songs": { type: "string", default: "5" },
    "base-url": { type: "string" }, apply: { type: "boolean", default: false },
    "skip-name": { type: "string", multiple: true },
  } })
  for (const file of [".env.local", ".env"]) require("dotenv").config({ path: path.join(ROOT, file), quiet: true })
  if (positionals.length !== 1) throw new Error("Use prepare or publish")
  if (positionals[0] === "prepare") {
    const minSongs = Number(values["min-songs"])
    if (!Number.isInteger(minSongs) || minSongs < 1) throw new Error("Invalid minimum song count")
    return prepare((values.report || []).map(file => path.resolve(file)), values.ca, minSongs, values["skip-name"])
  }
  if (positionals[0] !== "publish" || !values["base-url"]) throw new Error("Publish requires --base-url")
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"))
  if (values.apply) return publish(manifest, values.ca, values["base-url"])
  await verifyDeployment(manifest, values["base-url"])
  console.log("Deployment verified. No database writes; --apply is required.")
}

if (require.main === module) main().catch(error => {
  const safeMessages = new Set(["Deployment asset unavailable", "Deploy the current photo manifest before updating the database", "Photo credits are not deployed", "Deployed image checksum mismatch", "Local image checksum mismatch", "Cannot publish from a snapshot", "At least one --report is required"])
  console.error("Photo publication stopped:", safeMessages.has(error.message) ? error.message : error.code || error.name, "/ check deployment, CA and input. Credentials are not logged.")
  process.exitCode = 1
})
module.exports = { eligible, deploymentOrigin, verifyDeployment, checkedUpdate, prepare, publish }
