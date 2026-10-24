const { test, after } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const { EventEmitter } = require("node:events")
const { Readable } = require("node:stream")
const sharp = require("sharp")
sharp.cache(false)
const { decodeCopy, artistRecord, readSnapshot } = require("./lib/artist-image-source.cjs")
const core = require("./lib/artist-image-core.cjs")
const { isPublicAddress, imageRequestUrl, fetchPublicImage } = require("./lib/artist-image-network.cjs")
const { reviewHtml } = require("./artist-images.cjs")

const temporary = fs.mkdtemp(path.join(os.tmpdir(), "artist-image-tests-"))
after(async () => {
  const directory = path.resolve(await temporary)
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()))
  assert.ok(path.basename(directory).startsWith("artist-image-tests-"))
  await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})
const snak = value => ({ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value } } })
const item = id => ({ id })
const entity = (id, label, claims = {}) => ({ id, labels: { en: { value: label } }, claims })
const band = entity("Q100", "The Animals", { P31: [snak(item("Q215380"))], P18: [snak("Band portrait.jpg")] })
const human = entity("Q101", "Animals", { P31: [snak(item("Q5"))], P106: [snak(item("Q639669"))], P18: [snak("Singer.jpg")] })
const taxon = entity("Q102", "Animals", { P31: [snak(item("Q16521"))] })
const info = { url: "https://upload.wikimedia.org/photo.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Band.jpg", mime: "image/jpeg", width: 1200, height: 800,
  extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" }, Artist: { value: "<a href='https://example.com'>Photographer</a>" } } }
function wiki(entities = [band, taxon]) {
  return {
    async entity(id) { return entities.find(value => value.id === id) || entity(id, "Other") },
    async json(url) { return url.includes("wbsearchentities") ? { search: entities.map(value => ({ id: value.id, description: "" })) } : { query: { pages: [{ imageinfo: [info] }] } } },
  }
}

test("COPY decoding preserves escapes and never confuses null with a literal slash-N", () => {
  assert.equal(decodeCopy("\\N"), null); assert.equal(decodeCopy("\\\\N"), "\\N")
  assert.equal(decodeCopy("A\\tB\\nC\\\\n"), "A\tB\nC\\n")
})
test("snapshot reader extracts only Artist data, never user credentials", async () => {
  const file = path.join(await temporary, "backup.sql")
  await fs.writeFile(file, 'COPY public."Artist" (id, slug, name, image, category) FROM stdin;\na\tthe-animals\tThe Animals\t\\N\tstrane\n\\.\nCOPY public."User" (password) FROM stdin;\nSECRET\n\\.\n')
  const data = await readSnapshot(file)
  assert.equal(data.source.kind, "snapshot"); assert.equal(data.artists.length, 1)
  assert.equal(data.artists[0].image, null); assert.doesNotMatch(JSON.stringify(data), /SECRET|password/)
})
test("name-only exports are unknown, not incorrectly declared missing", async () => {
  const artist = artistRecord({ name: "The Animals" })
  assert.equal((await core.auditArtist(artist, {})).state, "unknown")
})
test("known blank image is missing, but an assigned image is always preserved", async () => {
  const missing = artistRecord({ name: "Artist", image: null })
  assert.equal((await core.auditArtist(missing, {})).state, "missing")
  const assigned = artistRecord({ name: "Artist", image: "https://example.com/image.jpg" })
  const result = await core.auditArtist(assigned, { publicRoot: await temporary })
  assert.equal(result.state, "unverified"); assert.equal(result.image, assigned.image)
})
test("local checks decode URL paths, detect missing files and reject traversal", async () => {
  const root = await temporary
  assert.throws(() => core.localImage(root, "/%2e%2e/private.jpg"))
  assert.throws(() => core.localImage(root, "/..%5cprivate.jpg"))
  assert.equal((await core.auditArtist(artistRecord({ name: "Missing", image: "/missing.jpg" }), { publicRoot: root })).state, "broken")
  const buffer = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#123456" } }).png().toBuffer()
  await fs.writeFile(path.join(root, "artist photo.png"), buffer)
  const result = await core.auditArtist(artistRecord({ name: "Real", image: "/artist%20photo.png" }), { publicRoot: root })
  assert.equal(result.state, "local-ok"); assert.equal(result.width, 300)
})
test("identity matching handles Serbian Cyrillic, accents and English band articles", () => {
  assert.equal(core.normalizeName("\u0402or\u0111e Bala\u0161evi\u0107"), core.normalizeName("\u0402\u043e\u0440\u0452\u0435 \u0411\u0430\u043b\u0430\u0448\u0435\u0432\u0438\u045b"))
  assert.equal(core.normalizeName("The Animals"), core.normalizeName("Animals"))
  assert.equal(core.nameMatches("Brian Ferry", entity("Q1", "Bryan Ferry")), false)
})
test("musical identity rejects animals and accepts a structured band or musician", async () => {
  const client = wiki()
  assert.equal(await core.musicEvidence(taxon, client), null)
  assert.equal(await core.musicEvidence(band, client), "musical-group")
  assert.equal(await core.musicEvidence(human, client), "musician")
})
test("discovery chooses the band, not an animal with the same label", async () => {
  const result = await core.discoverPhoto({ name: "Animals" }, wiki())
  assert.equal(result.wikidataId, "Q100"); assert.equal(result.state, "review-ready")
})
test("two valid musical identities stay ambiguous and are not downloaded", async () => {
  const result = await core.discoverPhoto({ name: "Animals" }, wiki([band, human]))
  assert.equal(result.state, "ambiguous"); assert.equal(result.photo, undefined)
})
test("deprecated claims and logo images are not selected", async () => {
  const logo = { ...band, claims: { ...band.claims, P18: [snak("Band logo.svg")] } }
  assert.equal((await core.discoverPhoto({ name: "Animals" }, wiki([logo]))).state, "no-photo")
  assert.deepEqual(core.claims({ claims: { P18: [{ ...snak("Old.jpg"), rank: "deprecated" }] } }, "P18"), [])
})
test("license metadata keeps authorship, recognizes CC deeds and fails closed", () => {
  const good = core.photoMetadata(info)
  assert.equal(good.allowed, true); assert.equal(good.author, "Photographer")
  const cc0 = { ...info, extmetadata: { ...info.extmetadata, LicenseShortName: { value: "CC0" }, LicenseUrl: { value: "http://creativecommons.org/publicdomain/zero/1.0/deed.en" } } }
  assert.equal(core.photoMetadata(cc0).allowed, true)
  assert.match(core.photoMetadata(cc0).licenseUrl, /^https:/)
  assert.equal(core.photoMetadata({ ...info, extmetadata: { ...info.extmetadata, NonFree: { value: "true" } } }).allowed, false)
  assert.equal(core.photoMetadata({ ...info, mime: "image/svg+xml" }).allowed, false)
  assert.equal(core.photoMetadata({ ...info, width: 80 }).allowed, false)
  assert.equal(core.photoMetadata({ ...info, extmetadata: {} }).allowed, false)
})
test("only trusted Wikimedia hosts are used for discovery and staging", () => {
  assert.ok(core.safeWikiUrl("https://thumb.wikimedia.org/photo.jpg"))
  for (const url of ["http://upload.wikimedia.org/a", "https://evil.test/a", "https://upload.wikimedia.org.evil.test/a", "https://u:p@upload.wikimedia.org/a", "https://upload.wikimedia.org:444/a"]) assert.throws(() => core.safeWikiUrl(url))
})
test("image network checks reject private, reserved and mapped addresses", async () => {
  for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.0.1", "100.64.0.1", "::1", "::ffff:127.0.0.1", "fd00::1", "2001:db8::1", "2001:0000::1", "2002:7f00::1"]) assert.equal(isPublicAddress(ip), false, ip)
  assert.equal(isPublicAddress("8.8.8.8"), true); assert.equal(isPublicAddress("2606:4700:4700::1111"), true)
  for (const url of ["http://example.com/a", "https://u:p@example.com/a", "https://127.0.0.1/a", "https://[::1]/a"]) assert.throws(() => imageRequestUrl(url))
  await assert.rejects(fetchPublicImage("https://example.com/a", { lookup: async () => [{ address: "127.0.0.1", family: 4 }], get() { throw Error("must not request") } }), /non-public/)
})
test("public image request pins DNS, verifies TLS and bounds response size", async () => {
  let options
  const get = (_url, config, callback) => {
    options = config
    const request = new EventEmitter(); request.setTimeout = () => request
    process.nextTick(() => { const response = Readable.from([Buffer.from("image")]); response.statusCode = 200; response.headers = { "content-type": "image/jpeg" }; callback(response) })
    return request
  }
  const deps = { lookup: async () => [{ address: "8.8.8.8", family: 4 }], get }
  assert.equal((await fetchPublicImage("https://example.com/a", deps)).data.toString(), "image")
  assert.equal(options.rejectUnauthorized, true)
  options.lookup("example.com", {}, (_error, address) => assert.equal(address, "8.8.8.8"))
  await assert.rejects(fetchPublicImage("https://example.com/a", { ...deps, maxBytes: 2 }), /size limit/)
})
test("staging keeps the full aspect ratio and cannot write an unapproved image", async () => {
  const directory = path.join(await temporary, "staged")
  const buffer = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "#456789" } }).jpeg().toBuffer()
  const client = { bytes: async () => ({ data: buffer, contentType: "image/jpeg" }) }
  const candidate = { state: "review-ready", wikidataId: "Q100", photo: { allowed: true, downloadUrl: info.url } }
  const file = await core.stagePhoto(candidate, directory, client)
  const metadata = await sharp(path.join(directory, file)).metadata()
  assert.equal(metadata.width, 960); assert.equal(metadata.height, 480)
  assert.equal(await core.stagePhoto(candidate, directory, client), file)
  await assert.rejects(core.stagePhoto({ ...candidate, state: "ambiguous" }, directory, client), /not eligible/)
})
test("report escapes untrusted artist text and does not create active unsafe links", () => {
  const html = reviewHtml({ createdAt: "now", source: { kind: "database" }, summary: {}, artists: [{ name: "<script>alert(1)</script>", image: "javascript:alert(1)", state: "unverified", candidate: { state: "not-found", description: "<img src=x onerror=alert(1)>" } }] })
  assert.doesNotMatch(html, /<script>alert|href="javascript:|<img src=x/)
  assert.match(html, /&lt;script&gt;/)
})
