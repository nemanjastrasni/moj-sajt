const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const { createAuditor, selectSample, songKey, compareSources, csvCell, escapeHtml } = require("./lib/song-audit.cjs")
const { sourceIndex, readSongs, renderHtml } = require("./audit-songs.cjs")
const song = (lyrics = "Am          G\nOvo je obican stih pesme") => ({ id: "song1", artist: "Test", artistSlug: "test", title: "Pesma", slug: "pesma", category: "domace", lyrics, chords: null, reviewStatus: "verified" })

test("passes known notation and preserves manual verification", () => {
  const input = song()
  const result = createAuditor()(input)
  assert.equal(result.outcome, "technical_pass")
  assert.equal(result.manualStatus, "verified")
  assert.equal(input.reviewStatus, "verified")
  assert.equal(input.lyrics, song().lyrics)
})

test("recognized alterations, connectors, riff and bass retain transposition and wrapping", () => {
  const result = createAuditor()(song("E(#9) E(b9) Cb6 Fism\nPamet kad se pomeri\nG{riff}\nPrica o probi\nF# B C# (bass: C# B A# G# F#)\nOvo je jos jedan dovoljno dugacak stih\nB----Em-- tad"))
  assert.ok(!result.issues.some(issue => ["transpose_failure", "wrap_failure", "unparsed_musical_line"].includes(issue.code)))
  assert.ok(!result.chords.includes("A#"), "bass-only notes are not diagram requirements")
})

test("unknown symbols on a mixed musical line are queued, not automatically repaired", () => {
  const input = song("Am----G----F7foo\nOvo je stih")
  const result = createAuditor()(input)
  assert.equal(result.outcome, "needs_attention")
  assert.ok(result.issues.some(issue => issue.code === "unparsed_musical_line" && issue.line === 1))
  assert.ok(input.lyrics.includes("F7foo"))
})

test("ordinary lyrics containing standalone A remain untouched", () => {
  const result = createAuditor()(song("Am\non A warm San Franciscan night\nG\nA nekad tako srecan sam bio"))
  assert.deepEqual(result.chords, ["Am", "G"])
  assert.ok(!result.issues.some(issue => issue.code === "unparsed_musical_line"))
})

test("missing diagram is distinct from parse or musical failure", () => {
  const result = createAuditor(() => false)(song())
  assert.deepEqual(result.issues.map(issue => issue.code), ["missing_diagram", "missing_diagram"])
  assert.equal(result.sourceConfirmedCandidate, false)
})

test("empty, text-only and malformed content cannot silently pass", () => {
  for (const text of ["", "Ovo je samo tekst", "Am\n<pre>los\uFFFD tekst</pre>"]) assert.equal(createAuditor()(song(text)).outcome, "needs_attention")
})

test("real tablature is not reported as dash corruption", () => {
  const result = createAuditor()(song("Am\nObican stih\ne|----0--2h3----|\nB|----1--1-----|"))
  assert.ok(!result.issues.some(issue => issue.code === "unparsed_musical_line"))
})

test("archive equality preserves alignment and conflicting versions stay explicit", () => {
  const input = song("Am----G\nObican stih")
  assert.equal(compareSources(input, []).state, "not_found")
  assert.equal(compareSources(input, [{ file: "one", text: "Am    G\r\nObican stih" }]).state, "same_parsed_layout")
  assert.equal(compareSources(input, [{ file: "two", text: "Am G\nObican stih" }]).state, "different")
  const result = createAuditor()(input, [{ file: "one", text: input.lyrics }, { file: "two", text: "Am G\nDrugi tekst" }])
  assert.equal(result.source.state, "exact_local_match")
  assert.equal(result.source.conflictingLocalVersions, true)
  assert.equal(result.sourceConfirmedCandidate, false)
})

test("safe technical pass plus unanimous local match is only a candidate", () => {
  const input = song()
  const result = createAuditor()(input, [{ file: "one", text: input.lyrics }])
  assert.equal(result.sourceConfirmedCandidate, true)
  assert.equal(result.manualStatus, "verified")
  assert.equal(createAuditor()(song()).sourceConfirmedCandidate, false)
})

test("sampling is deterministic and covers categories and notation buckets", () => {
  const rows = Array.from({ length: 300 }, (_, i) => ({ ...song(i % 2 ? "Am----G" : "[Am]Reci"), category: ["domace", "narodne", "strane"][i % 3], id: `s${i}` }))
  const sample = selectSample(rows, 200)
  assert.equal(sample.length, 200)
  assert.equal(new Set(sample.map(row => row.id)).size, 200)
  assert.equal(new Set(sample.map(row => row.category)).size, 3)
  assert.deepEqual(sample.map(row => row.id), selectSample([...rows].reverse(), 200).map(row => row.id))
  assert.equal(selectSample([], 200).length, 0)
  assert.throws(() => selectSample(rows, 0))
})

test("source matching never strips variant identifiers", () => {
  assert.equal(songKey("Bajaga", "Pesma"), songKey("BAJAGA", "pesma"))
  assert.notEqual(songKey("Test", "Pesma v2"), songKey("Test", "Pesma"))
  assert.notEqual(songKey("Other", "Pesma"), songKey("Test", "Pesma"))
})

test("indexes source names with multiple separators and nested category directories", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "song-audit-test-"))
  try {
    await fs.mkdir(path.join(directory, "domace"))
    await fs.writeFile(path.join(directory, "domace", "Test - Pesma - drugi deo.txt"), "Am\nTekst")
    const { index } = await sourceIndex([directory])
    assert.equal(index.get(songKey("Test", "Pesma - drugi deo")).length, 1)
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()))
    assert.ok(path.basename(directory).startsWith("song-audit-test-"))
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test("report HTML escapes artist names, excerpts and links; CSV neutralizes formulas", () => {
  assert.equal(csvCell("=HYPERLINK(1)"), '"\'=HYPERLINK(1)"')
  assert.equal(csvCell('one"two'), '"one""two"')
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;")
  const row = createAuditor()(song())
  row.artist = "<script>alert(1)</script>"
  const html = renderHtml({ audited: 1, totalSongs: 1, technicalPass: 1, needsAttention: 0, sourceConfirmedCandidates: 0, mode: "pilot", createdAt: "today" }, [row], "https://example.com")
  assert.ok(!html.includes("<script>"))
  assert.ok(html.includes("&lt;script&gt;"))
})

test("database reader enforces READ ONLY and contains no application writes", () => {
  const code = readSongs.toString()
  assert.ok(code.includes("REPEATABLE READ READ ONLY"))
  assert.ok(code.includes("transaction_read_only"))
  assert.ok(!/INSERT|UPDATE|DELETE|ALTER|CREATE TABLE/.test(code))
})
