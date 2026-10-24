require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const crypto = require("node:crypto")
const manifest = require("../public/artist-photos/manifest.json")
const { safeArtistImage, artistInitials } = require("../lib/artistMedia.ts")
const { getArtistImage, selectMosaicArtists } = require("../lib/artistPhotos.ts")
const record = photo => ({ id: photo.artistId, name: photo.artistName, slug: photo.slug, category: photo.category, image: photo.image, _count: { songs: 20 } })

test("images accept only local paths or plain HTTPS sources", () => {
  for (const value of [null, "", "//evil.test/a", "/\\evil.test/a", "javascript:alert(1)", "data:image/png;base64,a", "http://example.com/a", "https://user:pass@example.com/a", "/photo\n.jpg"]) assert.equal(safeArtistImage(value), null)
  assert.equal(safeArtistImage(" /artist-photos/a.webp "), "/artist-photos/a.webp")
  assert.equal(safeArtistImage("https://example.com/a.jpg"), "https://example.com/a.jpg")
})

test("missing and failed portraits have stable readable initials", () => {
  assert.equal(artistInitials(" Bijelo Dugme "), "BD")
  assert.equal(artistInitials("Babe"), "B")
  assert.equal(artistInitials(""), "?")
})

test("reviewed missing photos resolve by full artist identity, not artist name alone", () => {
  const photo = manifest.photos[0], artist = { ...record(photo), image: null }
  assert.equal(getArtistImage(artist), photo.image)
  for (const field of ["id", "name", "slug", "category"]) assert.equal(getArtistImage({ ...artist, [field]: "other" }), null)
  assert.equal(getArtistImage({ ...artist, image: "https://example.com/new.jpg" }), "https://example.com/new.jpg")
})

test("Babe repairs only the confirmed broken link, preserving manual replacements", () => {
  const photo = manifest.photos.find(p => p.artistName === "Babe")
  assert.ok(photo)
  const artist = { ...record(photo), image: "https://remixpress.com/wp-content/uploads/2015/09/Babe_foto_Dejan_Skopelja.jpg" }
  assert.equal(getArtistImage(artist), photo.image)
  assert.equal(getArtistImage({ ...artist, image: "https://example.com/manual.jpg" }), "https://example.com/manual.jpg")
  assert.equal(getArtistImage({ ...artist, id: "another-babe" }), artist.image)
})

test("mosaic filters before limiting, favors published local photos, and is deterministic", () => {
  const empty = Array.from({ length: 35 }, (_, i) => ({ id: String(i), name: "Empty " + i, slug: "empty-" + i, category: "domace", image: null, _count: { songs: 500 } }))
  const local = manifest.photos.filter(p => p.category === "domace").map(record)
  const remote = { ...empty[0], image: "https://example.com/external.jpg" }
  const input = [...empty, remote, ...local]
  const before = input.slice()
  const selected = selectMosaicArtists(input)
  assert.equal(selected.length, 12)
  assert.ok(selected.every(a => getArtistImage(a).startsWith("/artist-photos/")))
  assert.deepEqual(selected, selectMosaicArtists(input.slice().reverse()))
  assert.deepEqual(input, before)
  assert.equal(selectMosaicArtists([{ ...local[0], slug: null }]).length, 0)
  assert.deepEqual(selectMosaicArtists(empty), [])
})

test("all three category mosaics have twelve matching, attributed local photos", () => {
  for (const category of ["domace", "narodne", "strane"]) {
    const selected = selectMosaicArtists(manifest.photos.filter(p => p.category === category).map(record))
    assert.equal(selected.length, 12)
    assert.ok(selected.every(p => p.category === category))
  }
  for (const photo of manifest.photos) {
    const bytes = fs.readFileSync(require("node:path").join(__dirname, "../public", photo.image))
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), photo.sha256)
    assert.ok(photo.author && photo.license && photo.source)
  }
})
