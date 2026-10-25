/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS maintenance tests. */
const { test } = require("node:test")
const assert = require("node:assert/strict")
const core = require("./lib/biography-provenance.cjs")
const { boundedClient, html, needsLiveCheck } = require("./audit-biography-sources.cjs")
const { hashValue } = require("./artist-wiki.cjs")
const prose = "The band was founded by musicians and recorded several albums before touring abroad. ".repeat(20).trim()
const markup = `<div class="mw-parser-output"><p>${prose}</p></div>`
const artist = { id: "a", name: "The Example", slug: "the-example", category: "strane", songCount: 10, bio: prose }
const source = { language: "en", title: "The Example", pageId: 10, revisionId: 20, timestamp: "2026-10-25T12:00:00Z", url: "https://en.wikipedia.org/wiki/The_Example", revisionUrl: "https://en.wikipedia.org/w/index.php?oldid=20", historyUrl: "https://en.wikipedia.org/w/index.php?title=The+Example&action=history", license: "https://creativecommons.org/licenses/by-sa/4.0/", changes: "Existing excerpt; original import revision unknown." }
const result = { ...artist, hash: hashValue(prose), state: "source-matched", matched: true, wikidataId: "Q123", source }
const claim = id => ({ rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: { id } } } })
function artistClient(text = markup) {
  const entity = { id: "Q123", labels: { en: { value: artist.name } }, claims: { P31: [claim("Q215380")] }, sitelinks: { enwiki: { title: source.title } } }
  return {
    entity: async () => entity,
    json: async url => url.includes("action=wbsearchentities") ? { search: [{ id: entity.id, description: "rock band" }] }
      : url.includes("action=query") ? { query: { pages: [{ ns: 0, pageid: 10, title: source.title, pageprops: { wikibase_item: entity.id }, revisions: [{ revid: 20, timestamp: source.timestamp }] }] } }
      : { parse: { revid: 20, text } },
  }
}

test("whole legacy biography and exact old 1200-character cut can be attributed", () => {
  assert.equal(core.matchBiography(prose, markup).method, "legacy-six-paragraphs")
  assert.equal(core.matchBiography(prose.slice(0, 1200), markup).method, "legacy-1200-character-cut")
  assert.equal(core.normalized("\u0411\u0435\u043d\u0434 [12]\n je  osnovan."), "Bend je osnovan.")
})

test("partial, fuzzy and short matches never grant source confirmation", () => {
  assert.equal(core.matchBiography(prose + " Different ending.", markup).matched, false)
  assert.equal(core.matchBiography(prose.replace("band", "singer"), markup).matched, false)
  assert.equal(core.matchBiography("The band was founded.", markup).matched, false)
})

test("wrapped prose matches but reference/infobox-only matches and copyright warnings do not", () => {
  assert.equal(core.matchBiography(prose, `<div class="mw-parser-output"><section><p>Intro. ${prose} After.</p></section></div>`).matched, true)
  assert.equal(core.matchBiography(prose, `<div class="mw-parser-output"><table><tr><td><p>${prose}</p></td></tr></table></div>`).matched, false)
  assert.equal(core.matchBiography(prose, markup + '<div class="copyvio"></div>').reason, "source-warning")
})

test("suspicious subjects and duplicate records are review flags, not destructive commands", () => {
  assert.ok(core.localFlags({ bio: "YU 100: najbolji albumi jugoslovenske rok i pop muzike" }).includes("possible-non-artist-subject"))
  assert.deepEqual(core.localFlags(artist, ["Alias", artist.name]), ["same-text-on-multiple-artist-records"])
})

test("source metadata must be a mainspace artist page, not a namesake or disambiguation", async () => {
  for (const page of [{ ns: 0, pageprops: { wikibase_item: "Q999" } }, { ns: 1, pageprops: { wikibase_item: "Q123" } }, { ns: 0, pageprops: { wikibase_item: "Q123", disambiguation: "" } }]) {
    assert.equal(await core.readSource({ json: async () => ({ query: { pages: [page] } }) }, "en", "The Example", "Q123"), null)
  }
})

test("only the exact pinned revision HTML is accepted", async () => {
  const client = { json: async url => url.includes("action=query") ? { query: { pages: [{ ns: 0, pageid: 10, title: source.title, pageprops: { wikibase_item: "Q123" }, revisions: [{ revid: 20, timestamp: source.timestamp }] }] } } : { parse: { revid: 21, text: markup } } }
  assert.equal(await core.readSource(client, "en", source.title, "Q123"), null)
})

test("full inspection requires musical identity, complete text and confirmed edition license", async () => {
  const verified = await core.inspectBiography(artist, artistClient(), new Map([["en", { url: source.license }]]))
  assert.equal(verified.state, "source-matched")
  assert.equal(verified.wikidataId, "Q123")
  assert.equal(verified.source.revisionId, 20)
  assert.match(verified.source.changes, /Original import date\/revision is unknown/)
  const missingLicense = await core.inspectBiography(artist, artistClient(), new Map())
  assert.equal(missingLicense.state, "text-matched-license-unconfirmed")
  assert.equal(missingLicense.matched, false)
  const different = await core.inspectBiography({ ...artist, bio: prose + "Wrong ending." }, artistClient(), new Map([["en", { url: source.license }]]))
  assert.equal(different.state, "different-from-confirmed-artist-source")
  assert.equal(different.matched, false)
})

test("license confirmation rejects unrelated domains, NC licenses and URL credentials", async () => {
  const client = url => ({ json: async () => ({ query: { rightsinfo: { url, text: "license" } } }) })
  assert.equal((await core.siteLicense(client("https://creativecommons.org/licenses/by-sa/4.0/deed.sr"), "sr")).url, source.license)
  for (const url of ["https://example.org/licenses/by-sa/4.0/", "https://creativecommons.org/licenses/by-nc/4.0/", "https://user@creativecommons.org/licenses/by-sa/4.0/"]) assert.equal(await core.siteLicense(client(url), "en"), null)
})

test("credit merge preserves discographies, unrelated entries and original manifest", () => {
  const discography = { hash: "existing", year: "2000" }
  const manifest = { version: 1, artists: [{ artistId: "a", artistName: artist.name, slug: artist.slug, category: artist.category, wikidataId: "Q123", discography }, { artistId: "keep", artistName: "Other" }] }
  const before = structuredClone(manifest)
  const merged = core.mergeCredits(manifest, [artist], [result])
  assert.deepEqual(merged.added, ["a"])
  assert.deepEqual(merged.manifest.artists.find(row => row.artistId === "a").discography, discography)
  assert.deepEqual(merged.manifest.artists.find(row => row.artistId === "keep"), before.artists[1])
  assert.deepEqual(manifest, before)
})

test("changed biography, name, slug, category or artist identity prevents attribution", () => {
  for (const patch of [{ bio: prose + "Changed" }, { name: "Other" }, { slug: "other" }, { category: "narodne" }]) assert.equal(core.mergeCredits({ artists: [] }, [{ ...artist, ...patch }], [result]).added.length, 0)
  const manifest = { artists: [{ artistId: "a", artistName: artist.name, slug: artist.slug, category: artist.category, wikidataId: "Q999" }] }
  assert.equal(core.mergeCredits(manifest, [artist], [result]).added.length, 0)
})

test("unconfirmed or forged source metadata never reaches the public manifest", () => {
  assert.equal(core.mergeCredits({ artists: [] }, [artist], [{ ...result, matched: false }]).added.length, 0)
  for (const patch of [{ license: "unconfirmed" }, { revisionUrl: "javascript:alert(1)" }, { historyUrl: "https://example.org/" }, { revisionId: -20 }, { language: "unknown" }]) assert.equal(core.mergeCredits({ artists: [] }, [artist], [{ ...result, source: { ...source, ...patch } }]).added.length, 0)
})

test("zero-budget and offline cache misses fail promptly without sending requests", async () => {
  const { client, stats } = boundedClient(0)
  await assert.rejects(client.bytes("https://en.wikipedia.org/w/api.php"), { code: "CACHE_MISS" })
  stats.cacheOnly = false
  await assert.rejects(client.bytes("https://en.wikipedia.org/w/api.php"), { code: "NETWORK_BUDGET" })
  assert.equal(stats.requests, 0)
})

test("live retries target incomplete lookups, not already checked mismatches", () => {
  assert.equal(needsLiveCheck({ state: "different-from-confirmed-artist-source", errors: [] }), false)
  assert.equal(needsLiveCheck({ state: "different-from-confirmed-artist-source", errors: [{ state: "not-checked-network-needed" }] }), true)
  assert.equal(needsLiveCheck({ state: "not-checked-network-needed" }), true)
  assert.equal(needsLiveCheck({ state: "identity-ambiguous" }), false)
})

test("HTML escapes untrusted artist text and clearly separates matching from legal clearance", () => {
  const page = html({ biographies: 1, matched: 0, needsReview: 1 }, [{ ...result, name: "<script>unsafe</script>", excerpt: "<img src=x>", flags: [], duplicateNames: [] }], 1, 1)
  assert.doesNotMatch(page, /<script>unsafe|<img src=x>/)
  assert.match(page, /&lt;script&gt;/)
  assert.match(page, /nije nezavisna potvrda/)
})
