const { test } = require("node:test")
const assert = require("node:assert/strict")
const core = require("./lib/artist-wiki-core.cjs")
const tool = require("./artist-wiki.cjs")
const prose = "The band was founded by musicians and is known for its albums and concerts. ".repeat(5)

test("Serbian transliteration does not translate English or remove paragraph breaks", () => {
  assert.equal(core.toLatin("\u0402\u043e\u0440\u0452\u0435\n\u0411\u0430\u043b\u0430\u0448\u0435\u0432\u0438\u045b English"), "\u0110or\u0111e\nBala\u0161evi\u0107 English")
})
test("article extraction includes career prose but excludes references, infoboxes and controversies", () => {
  const result = core.extractArticle(`<div class="mw-parser-output"><table class="infobox"><tr><td>PRIVATE META</td></tr></table><p>${prose}<sup>[1]</sup></p><div class="mw-heading"><h2>Career</h2></div><p>${prose}Career details.</p><h2>Controversies</h2><p>${prose}SENSITIVE.</p><h2>References</h2><p>${prose}REFERENCE.</p></div>`)
  assert.ok(result.bio.includes("Career details")); assert.doesNotMatch(result.bio, /PRIVATE META|SENSITIVE|REFERENCE|\[1\]/)
})
test("missing citation annotations and very long paragraphs fail closed", () => {
  const result = core.extractArticle(`<p>${prose}<span class="citation-needed">citation needed</span></p><p>${prose}</p>`, { maxBio: 100 })
  assert.equal(result.bio, "")
})
test("discography uses album lists, not songs, references or chart statistics", () => {
  const result = core.extractArticle(`<p>${prose}</p><h2>Discography</h2><h3>Studio albums</h3><ul><li><i>First Album</i> (1999)</li><li><i>Second Album</i> (2001)</li><li><i>First Album</i> (1999)</li></ul><h3>Singles</h3><ul><li>Not An Album (2003)</li></ul><h2>References</h2><ul><li>Press Article (2010)</li></ul>`)
  assert.deepEqual(result.albums, [{ title: "First Album", year: "1999", kind: "studio" }, { title: "Second Album", year: "2001", kind: "studio" }])
})
test("discography table titles and release years do not become chart numbers", () => {
  const result = core.extractArticle(`<h2>Studio albums</h2><table><tr><th>Title</th><th>Details</th><th>Chart</th></tr><tr><th scope="row"><i>A Real Album</i></th><td>Released: 10 May 2008</td><td>1</td></tr></table><h2>Tracks</h2><ul><li>Song (2008)</li></ul>`)
  assert.deepEqual(result.albums, [{ title: "A Real Album", year: "2008", kind: "studio" }])
})
test("release-date lists inside structured table cells do not make album rows disappear", () => {
  const r = core.extractArticle('<h2>Studio albums</h2><table><tr><th>Title</th><th>Details</th></tr><tr><th scope="row"><i>Real Album</i></th><td><ul><li>Released: 1 May 2008</li><li>Label: Record Label</li></ul></td></tr></table>')
  assert.deepEqual(r.albums, [{ title: "Real Album", year: "2008", kind: "studio" }])
})
test("tracklist table album headers are parsed but song rows are never imported", () => {
  const r = core.extractArticle('<h2>Studio albums</h2><table class="tracklist"><tr><th class="tlheader mbox-text" colspan="10"><a>First Album</a> (Label, 1979)</th></tr><tr><td>1.</td><td><i>A Song</i></td><td>4:25</td></tr></table>')
  assert.deepEqual(r.albums, [{ title: "First Album", year: "1979", kind: "studio" }])
})
test("table headers without italics work, but an unknown table schema is skipped", () => {
  const result = core.extractArticle(`<h2>Diskografija</h2><table><tr><th>Godina</th><th>Naslov</th></tr><tr><td>2007</td><td>Album A</td></tr></table><table><tr><td>2008</td><td>Statistics</td></tr></table>`)
  assert.equal(result.albums.length, 1); assert.equal(result.albums[0].title, "Album A")
})
test("announced future releases and undated songs are not invented as albums", () => {
  const result = core.extractArticle(`<h2>Albums</h2><ul><li>Future (2099)</li><li>Undated</li><li>Present (2020)</li></ul>`, { yearNow: 2026 })
  assert.deepEqual(result.albums.map(a => a.title), ["Present"])
})
test("album years inside titles are not confused with release years", () => {
  const r = core.extractArticle('<h2>Compilation albums</h2><ul><li><i>Hits 1970-2010</i> (2011)</li></ul>')
  assert.equal(r.albums[0].year, "2011")
})
test("labels in italics are not imported as album titles, and unknown subsections stop album parsing", () => {
  const r = core.extractArticle('<h2>Discography</h2><h3>Albums</h3><ul><li>Real Album (<i>City Records</i>) (2007)</li></ul><h3>Singles</h3><ul><li>A song (2009)</li></ul><h3>Hits</h3><ul><li>Another song (2010)</li></ul>')
  assert.deepEqual(r.albums, [{ title: "Real Album", year: "2007", kind: "album" }])
})
test("layout tables containing album headings are parsed without treating their rows as releases", () => {
  const r = core.extractArticle('<h2>Discography</h2><table><tr><td><h4>Studio albums</h4><ul><li><i>First</i> (1979)</li></ul></td><td><h4>Live albums</h4><ul><li><i>Live</i> (1998)</li></ul></td></tr></table><h3>Appearances on compilations</h3><ul><li><i>Various Artists</i> (2000)</li></ul>')
  assert.deepEqual(r.albums.map(a => a.title), ["First", "Live"])
})
test("album types in separate layout-table columns do not leak into each other", () => {
  const r = core.extractArticle('<h2>Discography</h2><table><tr><td><h4>Studio albums</h4></td><td><h4>Live albums</h4></td></tr><tr><td><ul><li><i>Studio</i> (1979)</li></ul></td><td><ul><li><i>Live</i> (1998)</li></ul></td></tr></table>')
  assert.deepEqual(r.albums.map(a => a.kind), ["studio", "live"])
})
test("discography hashes survive PostgreSQL jsonb key reordering", () => {
  assert.equal(tool.hashValue([{ title: "Album", year: "2000", kind: "studio" }]), tool.hashValue([{ kind: "studio", year: "2000", title: "Album" }]))
})
test("page reads require matching Wikidata identity, namespace and non-disambiguation", async () => {
  for (const page of [{ ns: 0, pageprops: { wikibase_item: "Q999" } }, { ns: 1, pageprops: { wikibase_item: "Q100" } }, { ns: 0, pageprops: { wikibase_item: "Q100", disambiguation: "" } }]) {
    const client = { json: async () => ({ query: { pages: [page] } }) }
    assert.equal(await core.readArticle(client, "en", "Animals", "Q100"), null)
  }
})
test("a pinned revision is parsed and source/history/license are retained", async () => {
  const client = { json: async url => url.includes("action=query") ? { query: { pages: [{ ns: 0, pageid: 1, title: "The Animals", pageprops: { wikibase_item: "Q100" }, revisions: [{ revid: 123, timestamp: "2026-01-01" }] }] } } : { parse: { revid: 123, text: `<p>${prose}</p>` } } }
  const result = await core.readArticle(client, "en", "The Animals", "Q100")
  assert.ok(result.bio.includes("band")); assert.equal(result.source.revisionId, 123)
  assert.match(result.source.revisionUrl, /oldid=123$/); assert.match(result.source.historyUrl, /action=history/)
})
test("manual/different bios are preserved; empty, reviewed and matching truncations can change", () => {
  assert.equal(core.planBio(null, prose).action, "replace")
  assert.equal(core.planBio("A custom manually written biography", prose).action, "preserve")
  assert.equal(core.planBio("Wrong article", prose, true).action, "replace")
  assert.equal(core.planBio(prose, "").action, "preserve")
  const long = prose.repeat(10)
  assert.equal(core.planBio(long.slice(0, 1200), long).action, "replace")
  assert.equal(core.planBio(long, long + "New text").action, "preserve")
})
test("calendar detection is narrow and reviewed corrections bind exact pre-change content", () => {
  assert.equal(core.isCalendarBio("1992. je bila prestupna godina."), true)
  assert.equal(core.isCalendarBio("1992 is the name of a rock band."), false)
  const artist = { name: "Example", bio: "Wrong" }
  const reviewed = [{ name: "Example", beforeHash: tool.hashValue("Wrong") }]
  assert.equal(tool.reviewedWrong(artist, reviewed), true)
  assert.equal(tool.reviewedWrong({ ...artist, bio: "Edited" }, reviewed), false)
})
test("guarded field updates never touch photos, names, songs or members", async () => {
  const client = { query: async (sql, params) => {
    assert.equal(sql.split(" SET ")[1].split(" WHERE ")[0], '"bio" = $1')
    assert.match(sql, /"bio" IS NOT DISTINCT FROM \$6/)
    assert.equal(params[5], "Before"); assert.equal(params[0], "After")
    return { rowCount: 0 }
  } }
  assert.equal(await tool.checkedFieldUpdate(client, { id: "a", name: "A", slug: "a", category: null }, "bio", { before: "Before", after: "After" }), false)
  await assert.rejects(tool.checkedFieldUpdate(client, {}, "image", {}), /Unsupported/)
})
test("review HTML escapes imported text", () => {
  const html = tool.reviewHtml({ summary: {}, artists: [{ name: "<script>bad</script>", proposal: { state: "not-found" } }] })
  assert.doesNotMatch(html, /<script>bad/); assert.match(html, /&lt;script&gt;/)
})

test("empty SQL/jsonb discography guards compare as empty without overwriting populated JSON", async () => {
  const client = { query: async (sql, values) => {
    assert.match(sql, /COALESCE\("discography", 'null'::jsonb\) IS NOT DISTINCT FROM \$6::jsonb/)
    assert.equal(values[5], "null"); return { rowCount: 1 }
  } }
  assert.equal(await tool.checkedFieldUpdate(client, { id: "a" }, "discography", { before: null, after: [{ title: "Album", year: "2000" }] }), true)
})

test("clear-reviewed backs up locked rows first and affects only proven wrong biographies", async () => {
  const events = []
  const client = { query: async sql => { events.push(sql); return sql.startsWith("SELECT") ? { rows: [] } : { rowCount: 1 } }, end: async () => events.push("closed") }
  const report = { artists: [{ id: "bad", name: "Singer", bio: "1992. je bila prestupna godina." }, { id: "keep", name: "Artist", bio: "A manually written biography" }] }
  const result = await tool.applyChanges(report, null, { clearOnly: true, connect: async () => client, mkdir: async () => {}, save: async file => events.push(file.split(/[\\/]/).at(-1)), log: () => {} })
  assert.equal(result.updated.length, 1); assert.equal(result.updated[0].id, "bad")
  assert.ok(events.findIndex(e => e.includes("FOR UPDATE")) < events.indexOf("before.json"))
  assert.ok(events.indexOf("before.json") < events.findIndex(e => e.startsWith("UPDATE")))
  assert.ok(events.includes("COMMIT")); assert.equal(events.at(-1), "closed")
})
test("failed backup rolls back without any mutation", async () => {
  const events = []
  const client = { query: async sql => { events.push(sql); return { rows: [] } }, end: async () => events.push("closed") }
  await assert.rejects(tool.applyChanges({ artists: [{ id: "bad", name: "Singer", bio: "1992. je bila prestupna godina." }] }, null, { clearOnly: true, connect: async () => client, mkdir: async () => {}, save: async () => { throw Error("Disk full") }, log: () => {} }))
  assert.ok(events.includes("ROLLBACK")); assert.ok(!events.some(e => e.startsWith("UPDATE"))); assert.equal(events.at(-1), "closed")
})

require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { normalizeDiscography } = require("../lib/discography.ts")

test("standalone EP labels end studio-album lists in definition, paragraph and bold markup", () => {
  for (const label of ["<dl><dt>EP</dt></dl>", "<p>EPs</p>", "<b>EP</b>", "<strong>Extended plays</strong>"]) {
    const result = core.extractArticle('<h2>Discography</h2><dl><dt>Studio albums</dt></dl><ul><li>Studio (2011)</li></ul>' + label + '<ul><li>Not Studio (2005)</li></ul><h3>Studio albums</h3><ul><li>Next Studio (2014)</li></ul>')
    assert.deepEqual(result.albums.map(album => album.title), ["Studio", "Next Studio"])
  }
})

test("album title quotation marks are stripped only as a complete outer pair", () => {
  const result = core.extractArticle('<h2>Studio albums</h2><ul><li><i>Carl and the Passions - &quot;So Tough&quot;</i> (1972)</li><li><i>&quot;Quoted&quot;</i> (2000)</li></ul>')
  assert.deepEqual(result.albums.map(album => album.title), ['Carl and the Passions - "So Tough"', 'Quoted'])
})
test("both legacy string lists and structured albums render without object coercion", () => {
  assert.deepEqual(normalizeDiscography([{ title: "Album A", year: 2000, kind: "studio" }, "Album B (2001)", null, {}, "[object Object]"]), [{ title: "Album A", year: "2000", kind: "studio" }, { title: "Album B", year: "2001", kind: "album" }])
  assert.equal(normalizeDiscography("Album A (2000)\nAlbum A (2000)").length, 1)
})

test("ordinary photo clients do not gain Wikipedia access; content clients allow only selected languages", () => {
  const { WikiClient } = require("./lib/artist-image-core.cjs")
  assert.throws(() => new WikiClient().safeUrl("https://sr.wikipedia.org/w/api.php"))
  const client = core.wikipediaClient()
  assert.equal(client.safeUrl("https://sr.wikipedia.org/w/api.php").hostname, "sr.wikipedia.org")
  assert.throws(() => client.safeUrl("https://sr.wikipedia.org.evil.test/w/api.php"))
  assert.throws(() => client.safeUrl("http://sr.wikipedia.org/w/api.php"))
})

test("standalone bold single headings stop parsing under a previous live-album section", () => {
  const r = core.extractArticle('<h2>Discography</h2><h3>Live albums</h3><ul><li>Real Live Album (2001)</li></ul><b>Singlovi</b><ul><li>Single Song (2008)</li></ul>')
  assert.equal(r.albums.length, 1); assert.equal(r.albums[0].title, "Real Live Album")
})

test("failed deployment verification stops before opening a database connection", async () => {
  let connected = false
  await assert.rejects(tool.applyChanges({ artists: [] }, null, { loadManifest: async () => ({}), verify: async () => { throw Error("Not deployed") }, connect: async () => { connected = true } }), /Not deployed/)
  assert.equal(connected, false)
})
test("published content hashes bind exact new values and reject untyped albums", async () => {
  const album = { title: "A", year: "2000", kind: "album" }
  const report = { artists: [{ id: "a", changes: { discography: { before: null, after: [album] } } }] }
  const options = { loadManifest: async () => ({ artists: [{ artistId: "a", discography: { hash: tool.hashValue([album]) } }] }), verify: async () => {}, connect: async () => { throw Error("must not connect") } }
  await assert.rejects(tool.applyChanges(report, null, options), /Only confirmed studio/)
  await assert.rejects(tool.applyChanges({ artists: [{ id: "a", changes: { bio: { before: null, after: "Changed" } } }] }, null, options), /does not match/)
})

test("multiple album sections in one layout cell retain the nearest heading", () => {
  const result = core.extractArticle('<h2>Discography</h2><table><tr><td><h3>Studio albums</h3><ul><li>Studio (2000)</li></ul><h3>Live albums</h3><ul><li>Concert (2001)</li></ul><h3>Compilations</h3><ul><li>Collection (2002)</li></ul></td></tr></table>')
  assert.deepEqual(result.albums.map(a => a.kind), ["studio", "live", "compilation"])
})

test("plain multi-column album lists parse each release, not one combined row/year", () => {
  const result = core.extractArticle('<h2>Discography</h2><h3>Studio albums</h3><table><tr><td><ul><li><i>First</i> (1962.)</li><li><i>Second</i> (1963.)</li></ul></td><td><ul><li><i>Third</i> (1964.)</li></ul></td></tr></table>')
  assert.deepEqual(result.albums, [{ title: "First", year: "1962", kind: "studio" }, { title: "Second", year: "1963", kind: "studio" }, { title: "Third", year: "1964", kind: "studio" }])
})

test("a solo musician's former band's albums are not silently imported as solo releases", () => {
  const result = core.extractArticle('<h2>Discography</h2><h3>Solo albums</h3><ul><li>Solo (2000)</li></ul><h3>Former Band</h3><h4>Studio albums</h4><ul><li>Band (1986)</li></ul>', { subjectKind: "musician" })
  assert.deepEqual(result.albums.map(a => a.title), ["Solo"])
})

test("discography-only publication ignores biography changes and preserves backup/guard ordering", async () => {
  const album = { title: "Album", year: "2000", kind: "studio" }, events = []
  const client = { query: async (sql, params) => { events.push(sql); if (sql.startsWith("UPDATE")) { assert.match(sql, /SET "discography"/); assert.equal(params[0], JSON.stringify([album])) } return { rowCount: 1, rows: [] } }, end: async () => events.push("closed") }
  const report = { artists: [{ id: "a", changes: { bio: { before: "keep", after: "never write" }, discography: { before: null, after: [album] } } }] }
  const result = await tool.applyChanges(report, null, { fields: ["discography"], loadManifest: async () => ({ artists: [{ artistId: "a", discography: { hash: tool.hashValue([album]) } }] }), verify: async () => {}, connect: async () => client, mkdir: async () => {}, save: async file => events.push(file.split(/[\\/]/).at(-1)), log: () => {} })
  assert.deepEqual(result.updated.map(a => a.field), ["discography"])
  assert.ok(events.indexOf("before.json") < events.findIndex(e => e.startsWith("UPDATE")))
  assert.equal(events.at(-1), "closed")
  await assert.rejects(tool.applyChanges(report, null, { fields: ["image"] }), /Unsupported field selection/)
})

const { groupDiscography } = require("../lib/discography.ts")
test("album display groups types, sorts dates, keeps unknown years last and never translates titles", () => {
  const groups = groupDiscography([{ title: "Late (2005)", year: "2005", kind: "studio" }, { title: "Rano", year: "1999", kind: "studio" }, { title: "U\u017eivo", year: "2002", kind: "live" }, { title: "Best", year: "2007", kind: "compilation" }, { title: "Unknown", kind: "ep" }, "Legacy (1980)"])
  assert.deepEqual(groups.map(g => g.kind), ["studio", "live", "compilation", "album"])
  assert.deepEqual(groups[0].albums.map(a => a.title), ["Rano", "Late"])
  assert.deepEqual(groups.at(-1).albums.map(a => a.year), ["1980", ""])
  assert.deepEqual(groupDiscography(null), [])
})

test("discography recheck holds suspicious sources and never overwrites changed live data", async () => {
  const { recheck } = require("./recheck-discographies.cjs")
  const album = { title: "Studio", year: "2000", kind: "studio" }
  const make = (id, name, wikidataId) => ({ id, name, slug: id, category: "strane", discography: null, proposal: { evidence: "musical-group", wikidataId, discographySource: { language: "en", revisionId: 10 } }, changes: { discography: { before: null, after: [album] } } })
  const good = make("good", "Good Band", "Q123"), held = make("held", "Pink Floyd", "Q2306"), changed = make("changed", "Changed", "Q124")
  const result = await recheck({ artists: [good, held, changed] }, [good, held, { ...changed, discography: [album] }], async () => '<h2>Studio albums</h2><ul><li>Studio (2000)</li></ul>')
  assert.equal(result.unchanged.artists.length, 1)
  assert.equal(result.unchanged.artists[0].id, "good")
  assert.equal(result.skipped.length, 2)
})

test("published recheck requires exact current credit hashes and preserves manual or renamed data", () => {
  const { publishedReport } = require("./recheck-discographies.cjs")
  const albums = [{ title: "Album", year: "2000", kind: "studio" }]
  const original = { id: "a", name: "Artist", slug: "artist", category: "strane", proposal: { wikidataId: "Q123", evidence: "musical-group" } }
  const current = { ...original, bio: "Keep", discography: albums }
  const manifest = { artists: [{ artistId: "a", wikidataId: "Q123", discography: { hash: tool.hashValue(albums), language: "en", revisionId: 1 } }] }
  const report = { source: "live-database", artists: [original] }
  const found = publishedReport(report, [current], manifest)
  assert.equal(found.artists.length, 1)
  assert.deepEqual(found.artists[0].changes.discography.before, albums)
  assert.deepEqual(Object.keys(found.artists[0].changes), ["discography"])
  assert.equal(Object.hasOwn(found.artists[0].proposal.discographySource, "hash"), false)
  for (const changed of [{ ...current, name: "Renamed" }, { ...current, discography: [...albums, { title: "Manual", year: "2001" }] }]) {
    const result = publishedReport(report, [changed], manifest)
    assert.equal(result.artists.length, 0)
    assert.equal(result.preserved.length, 1)
  }
  assert.equal(publishedReport(report, [current], { artists: [] }).artists.length, 0)
})
