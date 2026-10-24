/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS module-loader stubs. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const Module = require("node:module")
const { PDFDocument, PDFName } = require("pdf-lib")
const model = require("../lib/songbook/model.ts")
const { printBlocks } = require("../lib/songbook/layout.ts")
const { generateSongbookPdf } = require("../lib/songbook/pdf.ts")
let state, session, down
const prisma = {
  user: { findUnique: async ({ where }) => { if (down) throw Error("secret-db-url"); return state.users.find(user => user.id === where.id) ?? null } },
  favorite: { findMany: async ({ where }) => state.favorites.filter(favorite => favorite.userId === where.userId && where.songId.in.includes(favorite.song.id)) },
}
const originalLoad = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return originalLoad.call(this, request, parent, isMain)
}
let POST
try { POST = require("../app/api/songbook/route.ts").POST } finally { Module._load = originalLoad }
const song = (id, lyrics = "G       D\nOvo je tekst pesme\n") => ({ id, title: "Pesma " + id, lyrics, artist: { name: "Bend" } })
beforeEach(() => {
  state = { users: [{ id: "one", role: "user", banned: false }, { id: "two", role: "user", banned: false }], favorites: [{ userId: "one", song: song("a") }, { userId: "one", song: song("b") }, { userId: "two", song: song("private") }] }
  session = { user: { id: "one" } }; down = false
})
const request = (body, headers = {}) => new Request("https://site.test/api/songbook", { method: "POST", headers: { origin: "https://site.test", "content-type": "application/json", ...headers }, body: JSON.stringify(body) })
const entries = [{ id: "b", transpose: -2 }, { id: "a", transpose: 3 }]

test("book selections are bounded, duplicate-free and contain only allowed fields", () => {
  assert.deepEqual(model.validateBookEntries([{ id: "a", transpose: 0, lyrics: "forged", userId: "two" }]), [{ id: "a", transpose: 0 }])
  for (const value of [null, [], Array(101).fill({ id: "a", transpose: 0 }), [{ id: "a", transpose: 12 }], [{ id: "../a", transpose: 0 }], [{ id: "a", transpose: 1.5 }], [{ id: "a", transpose: 0 }, { id: "a", transpose: 0 }]]) assert.throws(() => model.validateBookEntries(value))
})
test("draft restoration drops removed favorites, duplicates, invalid values and oversized state", () => {
  const raw = JSON.stringify({ version: 1, title: "My book", fontSize: 999, contents: false, songs: [{ id: "a", transpose: -13 }, { id: "a", transpose: 2 }, { id: "removed", transpose: 0 }, { id: "b", transpose: "invalid" }] })
  const draft = model.restoreBookDraft(raw, new Set(["a", "b"]))
  assert.deepEqual(draft.songs, [{ id: "a", transpose: -1 }, { id: "b", transpose: 0 }]); assert.equal(draft.fontSize, 11); assert.equal(draft.contents, false)
  assert.deepEqual(model.restoreBookDraft("{", new Set()), model.emptyBook())
  assert.deepEqual(model.restoreBookDraft("x".repeat(30001), new Set()), model.emptyBook())
})
test("reordering is immutable, bounded and preserves per-song transposition", () => {
  const input = [{ id: "a", transpose: -2 }, { id: "b", transpose: 3 }]
  assert.deepEqual(model.moveBookEntry(input, "b", -1), [input[1], input[0]])
  assert.equal(input[0].id, "a"); assert.equal(model.moveBookEntry(input, "a", -1), input)
  assert.equal(model.normalizeTranspose(-25), -1); assert.equal(model.normalizeTranspose(Infinity), 0)
})
test("unauthenticated, banned and deleted accounts cannot fetch book contents", async () => {
  session = null; assert.equal((await POST(request({ songs: entries }))).status, 401)
  session = { user: { id: "one" } }; state.users[0].banned = true
  assert.equal((await POST(request({ songs: entries }))).status, 403)
  state.users = []; assert.equal((await POST(request({ songs: entries }))).status, 403)
})
test("cross-origin, non-JSON, malformed and oversized requests are rejected", async () => {
  assert.equal((await POST(request({ songs: entries }, { origin: "https://evil.test" }))).status, 403)
  assert.equal((await POST(request({ songs: entries }, { "sec-fetch-site": "cross-site" }))).status, 403)
  assert.equal((await POST(request({ songs: entries }, { "content-type": "text/plain" }))).status, 415)
  assert.equal((await POST(new Request("https://site.test/api/songbook", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400)
  assert.equal((await POST(request({ oversized: "x".repeat(200001) }))).status, 413)
})
test("users can export only their own current favorites, ignoring forged user/title/lyrics fields", async () => {
  const response = await POST(request({ userId: "two", songs: entries.map(entry => ({ ...entry, lyrics: "forged", title: "forged" })) }))
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.deepEqual(data.songs.map(song => [song.id, song.transpose]), [["b", -2], ["a", 3]])
  assert.equal(data.songs[0].title, "Pesma b"); assert.equal(data.songs[0].lyrics, song("b").lyrics)
  assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("vary"), "Cookie")
  assert.equal((await POST(request({ songs: [{ id: "private", transpose: 0 }] }))).status, 403)
})
test("missing favorites never result in a silent partial book", async () => {
  state.favorites = state.favorites.filter(f => f.song.id !== "a")
  const response = await POST(request({ songs: entries }))
  assert.equal(response.status, 403); assert.equal((await response.json()).songs, undefined)
})
test("empty songs and excessive response size fail with useful bounded errors", async () => {
  state.favorites[0].song.lyrics = ""
  assert.equal((await POST(request({ songs: entries }))).status, 413)
  state.favorites = Array.from({ length: 20 }, (_, i) => ({ userId: "one", song: song("big-" + i, "x".repeat(100000)) }))
  assert.equal((await POST(request({ songs: state.favorites.map(f => ({ id: f.song.id, transpose: 0 })) }))).status, 413)
})
test("database failures do not leak secrets or look like an empty successful book", async () => {
  down = true; const response = await POST(request({ songs: entries }))
  assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /secret-db/)
})
test("print wrapping retains paired chord/lyric rows and all long-word characters", () => {
  const input = "G       D\nThis is a lyric that wraps into multiple segments\n" + "x".repeat(120)
  const blocks = printBlocks(input, 20)
  assert.ok(blocks.some(block => block.rows.length === 2))
  for (const block of blocks) for (const row of block.rows) assert.ok(row.text.length <= 20)
  assert.equal(blocks.flatMap(b => b.rows).filter(r => r.kind === "lyrics").map(r => r.text).join(""), "This is a lyric that wraps into multiple segments" + "x".repeat(120))
})
test("tablature wraps in synchronized six-string chunks and never makes oversized row groups", () => {
  const lines = ["e|", "B|", "G|", "D|", "A|", "E|"].map(prefix => prefix + "--0--2--3--".repeat(8))
  const blocks = printBlocks(lines.join("\n"), 30)
  assert.ok(blocks.length > 1); assert.ok(blocks.every(block => block.rows.length === 6))
  for (let i = 0; i < 6; i++) assert.equal(blocks.map(block => block.rows[i].text).join(""), lines[i])
  assert.ok(printBlocks(Array(30).fill(lines[0]).join("\n"), 30).every(block => block.rows.length <= 6))
})

const fonts = { regular: fs.readFileSync(path.join(__dirname, "../public/fonts/songbook/DejaVuSansMono.ttf")), bold: fs.readFileSync(path.join(__dirname, "../public/fonts/songbook/DejaVuSansMono-Bold.ttf")) }
const options = { title: "Moja pesmarica", fontSize: 11, book: true, contents: true, locale: "sr" }
const pdfSong = { id: "one", title: "\u010cudna no\u0107", artist: "\u0110or\u0111e i bend", lyrics: "  G            D\n\u010cuvaj \u010d, \u0107, \u0161, \u0111, \u017e i sve razmake.\nE(#9) E(b9) Am A7\nTekst sa izmenjenim akordima.\n", transpose: 2 }

test("real PDF has embedded fonts, an A4 page and no menu/video content", async () => {
  const result = await generateSongbookPdf([pdfSong], { ...options, book: false, contents: false }, fonts)
  const doc = await PDFDocument.load(result.bytes)
  assert.equal(doc.getPageCount(), 1); assert.equal(doc.getTitle(), options.title)
  assert.ok(Math.abs(doc.getPage(0).getWidth() - 595.28) < .01)
  assert.equal(doc.catalog.has(PDFName.of("OpenAction")), false)
})
test("real multi-page songbook has correct ordered starts, clickable contents and Unicode metadata", async () => {
  const lyrics = Array.from({ length: 100 }, (_, i) => `Em       D\nPAIR_${String(i).padStart(3, "0")} Ovo je stih pesme za proveru preloma.`).join("\n")
  const tab = ["e|", "B|", "G|", "D|", "A|", "E|"].map(prefix => prefix + "--0--2--3--".repeat(14)).join("\n")
  const songs = [{ ...pdfSong, lyrics: pdfSong.lyrics + lyrics }, { id: "cyr", title: "\u0409\u0443\u0431\u0430\u0432 \u0438 \u043c\u0443\u0437\u0438\u043a\u0430", artist: "\u041f\u0440\u043e\u0431\u043d\u0438 \u0431\u0435\u043d\u0434", lyrics: "Em       C\n\u0409\u0443\u0431\u0430\u0432 \u0447\u0443\u0432\u0430 \u043d\u0430\u0448\u0435 \u0434\u0430\u043d\u0435.\n", transpose: -1 }, { id: "tab", title: "Tab i dugi redovi", artist: "Test", lyrics: tab + "\n" + "LongWord".repeat(30) + "\nEND_OF_BOOK", transpose: 0 }]
  const result = await generateSongbookPdf(songs, options, fonts)
  assert.ok(result.pageCount > 5); assert.equal(result.songPages[0].page, 3); assert.ok(result.songPages[1].page > 3)
  const doc = await PDFDocument.load(result.bytes)
  assert.equal(doc.getPage(1).node.Annots().size(), 3)
  const directory = path.join(__dirname, "../reports/songbook")
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, "qa-songbook.pdf"), result.bytes)
  fs.writeFileSync(path.join(directory, "qa-layout.json"), JSON.stringify(result.songPages))
})
test("invalid/oversized input and unsupported glyphs fail without a corrupt PDF", async () => {
  await assert.rejects(generateSongbookPdf([], options, fonts))
  await assert.rejects(generateSongbookPdf([pdfSong], { ...options, fontSize: Infinity }, fonts))
  await assert.rejects(generateSongbookPdf([{ ...pdfSong, title: "Unsupported \udbff\udfff" }], options, fonts), /U\+10FFFF/)
})

const { favoritePdfSongs } = require("../lib/songbook/client.ts")
const nativeFetch = global.fetch
afterEach(() => { global.fetch = nativeFetch })
test("client rejects missing, reordered and malformed book responses", async () => {
  for (const body of [{ songs: [] }, { songs: [pdfSong, pdfSong] }, { error: "Denied" }]) {
    global.fetch = async () => new Response(JSON.stringify(body), { status: body.error ? 403 : 200 })
    await assert.rejects(favoritePdfSongs(entries))
  }
  global.fetch = async () => new Response("<html>error</html>", { status: 500 })
  await assert.rejects(favoritePdfSongs(entries), /PDF nije napravljen/)
})
