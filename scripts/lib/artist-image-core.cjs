const fs = require("node:fs/promises")
const path = require("node:path")
const crypto = require("node:crypto")
const sharp = require("sharp")
const cheerio = require("cheerio")
const { fetchPublicImage } = require("./artist-image-network.cjs")

const WIKI_HOSTS = new Set(["www.wikidata.org", "commons.wikimedia.org", "upload.wikimedia.org", "thumb.wikimedia.org"])
const USER_AGENT = "GitaraAkordiImageAudit/1.0 (https://gitarakordi.com; artist photography review)"
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const digest = text => crypto.createHash("sha256").update(text).digest("hex")

function safeWikiUrl(value) {
  const url = new URL(value)
  if (url.protocol !== "https:" || url.username || url.password || url.port || !WIKI_HOSTS.has(url.hostname)) throw new Error("Unapproved image/source host")
  return url
}

function localImage(publicRoot, image) {
  if (!image.startsWith("/") || image.startsWith("//")) return null
  const clean = decodeURIComponent(image.split(/[?#]/)[0])
  if (clean.includes("\0") || clean.includes("\\")) throw new Error("Invalid local image path")
  const file = path.resolve(publicRoot, "." + clean)
  const relative = path.relative(publicRoot, file)
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Local image escapes public directory")
  return file
}

class WikiClient {
  constructor({ cacheDir, interval = 350, request = fetch } = {}) {
    this.cacheDir = cacheDir; this.interval = interval; this.request = request; this.last = 0; this.entities = new Map()
  }
  async bytes(value, maxBytes = 12000000) {
    let url = safeWikiUrl(value)
    for (let hop = 0; hop < 4; hop++) {
      await pause(Math.max(0, this.last + this.interval - Date.now())); this.last = Date.now()
      const response = await this.request(url, { headers: { "User-Agent": USER_AGENT }, redirect: "manual", signal: AbortSignal.timeout(15000) })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel()
        url = safeWikiUrl(new URL(response.headers.get("location"), url).href); continue
      }
      if (!response.ok) { await response.body?.cancel(); const error = new Error(`Wikimedia HTTP ${response.status}`); error.status = response.status; throw error }
      if (Number(response.headers.get("content-length")) > maxBytes) { await response.body?.cancel(); throw new Error("Remote file exceeds size limit") }
      const chunks = []; let size = 0
      const reader = response.body.getReader()
      try {
        while (true) {
          const { done, value: chunk } = await reader.read(); if (done) break
          size += chunk.byteLength
          if (size > maxBytes) { await reader.cancel(); throw new Error("Remote file exceeds size limit") }
          chunks.push(Buffer.from(chunk))
        }
      } finally { reader.releaseLock() }
      return { data: Buffer.concat(chunks), contentType: response.headers.get("content-type") || "", url: url.href }
    }
    throw new Error("Too many redirects")
  }
  async json(url) {
    safeWikiUrl(url)
    const file = this.cacheDir && path.join(this.cacheDir, digest(url) + ".json")
    if (file) {
      try { const cached = JSON.parse(await fs.readFile(file, "utf8")); if (Date.now() - cached.at < 7 * 86400000) return cached.data } catch {}
    }
    const { data: bytes } = await this.bytes(url, 4000000)
    const data = JSON.parse(bytes.toString("utf8"))
    if (data.error) throw new Error("Wikimedia API error: " + data.error.code)
    if (file) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify({ at: Date.now(), data })) }
    return data
  }
  async entity(id) {
    if (!/^Q\d+$/.test(id)) throw new Error("Invalid Wikidata id")
    if (!this.entities.has(id)) this.entities.set(id, this.json(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`).then(data => data.entities[id]))
    return this.entities.get(id)
  }
}

async function auditArtist(artist, { publicRoot, client, checkRemote = false }) {
  if (!artist.imageKnown) return { ...artist, state: "unknown", detail: "Name-only export; image field was not exported" }
  if (!artist.image?.trim()) return { ...artist, state: "missing", detail: "No image assigned" }
  try {
    const local = localImage(publicRoot, artist.image)
    if (local) {
      // A symlink may not redirect a public URL outside the public directory.
      const real = await fs.realpath(local); const root = await fs.realpath(publicRoot)
      if (path.relative(root, real).startsWith("..") || path.isAbsolute(path.relative(root, real))) throw new Error("Local image leaves public directory")
      const metadata = await sharp(real, { limitInputPixels: 40000000 }).metadata()
      return { ...artist, state: metadata.width >= 160 && metadata.height >= 160 ? "local-ok" : "small-image", width: metadata.width, height: metadata.height }
    }
    const url = new URL(artist.image)
    if (url.protocol !== "https:" || url.username || url.password) return { ...artist, state: "unverified", detail: "Not a plain HTTPS image URL" }
    if (!checkRemote) return { ...artist, state: "unverified", detail: "Remote image preserved; network check not requested" }
    const { data, contentType } = url.hostname === "upload.wikimedia.org" ? await client.bytes(url.href) : await fetchPublicImage(url.href)
    if (!contentType.startsWith("image/")) throw new Error("Response is not an image")
    const metadata = await sharp(data, { limitInputPixels: 40000000 }).metadata()
    return { ...artist, state: metadata.width >= 160 && metadata.height >= 160 ? "remote-ok" : "small-image", width: metadata.width, height: metadata.height }
  } catch (error) {
    const broken = error.code === "ENOENT" || [404, 410].includes(error.status)
    return { ...artist, state: broken ? "broken" : "unverified", detail: broken ? "File not found" : "Could not verify file safely" }
  }
}

const cyrillic = Object.fromEntries(Array.from("абвгдђежзијклљмнњопрстћуфхцчџш").map((letter, index) => [letter, ["a","b","v","g","d","dj","e","z","z","i","j","k","l","lj","m","n","nj","o","p","r","s","t","c","u","f","h","c","c","dz","s"][index]]))
function normalizeName(value) {
  return value.toLowerCase().replace(/[а-яђјљњћџ]/g, char => cyrillic[char] ?? char).replace(/đ/g, "dj").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/^the /, "").replace(/\s+/g, " ")
}
function claims(entity, property) {
  return (entity?.claims?.[property] ?? []).filter(item => item.rank !== "deprecated" && item.mainsnak?.snaktype === "value").map(item => item.mainsnak.datavalue?.value).filter(Boolean)
}
function nameMatches(name, entity) {
  const labels = Object.values(entity.labels ?? {}).map(item => item.value)
  const aliases = Object.values(entity.aliases ?? {}).flat().map(item => item.value)
  const wanted = normalizeName(name)
  return Boolean(wanted) && [...labels, ...aliases].some(value => normalizeName(value) === wanted)
}
async function reaches(id, roots, client, depth = 0, seen = new Set()) {
  if (roots.has(id)) return true
  if (depth >= 4 || seen.has(id) || seen.size >= 25) return false
  seen.add(id)
  const entity = await client.entity(id)
  for (const parent of claims(entity, "P279")) if (parent.id && await reaches(parent.id, roots, client, depth + 1, seen)) return true
  return false
}
async function musicEvidence(entity, client) {
  const types = claims(entity, "P31").map(value => value.id)
  if (types.includes("Q5")) {
    for (const job of claims(entity, "P106")) if (await reaches(job.id, new Set(["Q639669", "Q177220"]), client)) return "musician"
    return null
  }
  for (const type of types) if (await reaches(type, new Set(["Q215380"]), client)) return "musical-group"
  return null
}
function plain(value = "") { return cheerio.load(String(value)).text().replace(/\s+/g, " ").trim() }
function isArtistPhoto(photo) {
  let source = photo.filePage || ""
  try { source = decodeURIComponent(source) } catch {}
  return !/\b(?:statue|monument|sculpture|gravestone|tombstone|tomb|headstone|memorial|logo|autograph|signature)\b|nadgrobn|spomenik|grobnica|\u0441\u043f\u043e\u043c\u0435\u043d\u0438\u043a|\u043d\u0430\u0434\u0433\u0440\u043e\u0431|\u043c\u043e\u0433\u0438\u043b|postage stamp|album cover/i.test((photo.description || "") + " " + source.replace(/_/g, " "))
}
function photoMetadata(info) {
  const meta = info.extmetadata ?? {}
  const field = name => plain(meta[name]?.value ?? "")
  const license = field("LicenseShortName"), author = field("Artist")
  let licenseUrl = field("LicenseUrl")
  const nonFree = field("NonFree").toLowerCase()
  const freeLicense = /^(?:CC BY(?:-SA)? [1-4]\.0|CC BY(?:-SA)? 2\.5|CC0(?: 1\.0)?|Public domain)$/i.test(license)
  let validLicenseUrl = false
  try {
    const url = new URL(licenseUrl)
    if (url.protocol === "http:" && url.hostname === "creativecommons.org") url.protocol = "https:"
    validLicenseUrl = url.protocol === "https:" && url.hostname === "creativecommons.org" && !url.username && !url.password && !url.port && /^\/(?:licenses\/by(?:-sa)?\/[1-4](?:\.0|\.5)|publicdomain\/(?:zero|mark)\/1\.0)(?:\/deed\.[a-z-]+)?\/?$/i.test(url.pathname)
    if (validLicenseUrl) licenseUrl = url.href
  } catch {}
  const allowed = freeLicense && !["true", "1"].includes(nonFree) && Boolean(author) && (validLicenseUrl || /^Public domain$/i.test(license)) && ["image/jpeg", "image/png", "image/webp"].includes(info.mime) && info.width >= 320 && info.height >= 240 && isArtistPhoto({ description: field("ImageDescription"), filePage: info.descriptionurl })
  return { allowed, license, licenseUrl, author, credit: field("Credit"), restrictions: field("Restrictions"), description: field("ImageDescription"), filePage: info.descriptionurl, downloadUrl: info.thumburl || info.url, width: info.width, height: info.height }
}

async function discoverPhoto(artist, client) {
  const ids = new Set()
  for (const language of ["en", "sr"]) {
    const data = await client.json("https://www.wikidata.org/w/api.php?" + new URLSearchParams({ action: "wbsearchentities", search: artist.name, language, uselang: "en", type: "item", limit: "8", format: "json" }))
    for (const item of data.search ?? []) {
      const description = item.description || ""
      const musical = /band|singer|musician|vocalist|composer|orchestra|musical group|peva|pjeva|muzi|glazb|bend|пева|музич|група/i.test(description)
      const clearlyOther = /\b(?:album|single|song|film|video game|journal|species|genus|kingdom|taxon|village)\b/i.test(description)
      if (/^Q\d+$/.test(item.id) && (!clearlyOther || musical)) ids.add(item.id)
    }
  }
  const matches = []
  for (const id of ids) {
    const entity = await client.entity(id)
    if (!nameMatches(artist.name, entity)) continue
    const evidence = await musicEvidence(entity, client)
    if (evidence) matches.push({ entity, evidence })
  }
  if (matches.length !== 1) return { state: matches.length ? "ambiguous" : "not-found", matches: matches.map(({ entity }) => ({ id: entity.id, description: entity.descriptions?.en?.value ?? "" })) }
  const { entity, evidence } = matches[0]
  const filename = claims(entity, "P18").find(value => typeof value === "string" && !/logo|signature|coat.of.arms|flag|\.svg$/i.test(value))
  const identity = { wikidataId: entity.id, entityUrl: `https://www.wikidata.org/wiki/${entity.id}`, evidence, label: entity.labels?.en?.value ?? artist.name, description: entity.descriptions?.en?.value ?? "" }
  if (!filename) return { state: "no-photo", ...identity }
  const data = await client.json("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ action: "query", titles: "File:" + filename, prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "960", iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|Restrictions|NonFree|ImageDescription", format: "json", formatversion: "2" }))
  const info = data.query?.pages?.[0]?.imageinfo?.[0]
  if (!info) return { state: "no-photo", ...identity }
  const photo = photoMetadata(info)
  if (photo.downloadUrl) safeWikiUrl(photo.downloadUrl)
  return { state: photo.allowed ? "review-ready" : "license-or-quality-review", ...identity, photo }
}

async function stagePhoto(candidate, directory, client) {
  if (candidate.state !== "review-ready" || !candidate.photo?.allowed) throw new Error("Candidate is not eligible for staging")
  if (!/^Q\d{1,15}$/.test(candidate.wikidataId)) throw new Error("Invalid candidate identity")
  const { data, contentType } = await client.bytes(candidate.photo.downloadUrl)
  if (!["image/jpeg", "image/png", "image/webp"].some(type => contentType.split(";")[0].trim() === type)) throw new Error("Unsupported image response")
  const optimized = await sharp(data, { limitInputPixels: 40000000 }).rotate().resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
  const filename = candidate.wikidataId + "-" + digest(optimized).slice(0, 16) + ".webp"
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(path.join(directory, filename), optimized, { flag: "wx" }).catch(error => { if (error.code !== "EEXIST") throw error })
  return filename
}

module.exports = { WikiClient, localImage, auditArtist, normalizeName, nameMatches, claims, musicEvidence, photoMetadata, discoverPhoto, stagePhoto, safeWikiUrl, digest, isArtistPhoto }
