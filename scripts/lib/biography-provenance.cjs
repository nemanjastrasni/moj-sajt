/* eslint-disable @typescript-eslint/no-require-imports -- Shared CommonJS maintenance helpers. */
const cheerio = require("cheerio")
const { toLatin, isCalendarBio, LANGUAGES } = require("./artist-wiki-core.cjs")
const { resolveMusicIdentity } = require("./artist-image-core.cjs")
const { hashValue } = require("../artist-wiki.cjs")

function normalized(text) {
  return toLatin(String(text || "")).normalize("NFC").replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim()
}

function legacyExtract(html) {
  const $ = cheerio.load(html)
  return normalized($(".mw-parser-output > p").slice(0, 6).toArray().map(node => $(node).text()).join("\n\n"))
}

function matchBiography(before, html) {
  const text = normalized(before)
  if (text.length < 200) return { matched: false, reason: "short-text-needs-review" }
  const $ = cheerio.load(html)
  if ($(".copyvio,.copyright-problem,.mw-disambig,.ambox-copyvio").length) return { matched: false, reason: "source-warning" }
  const legacy = legacyExtract(html)
  if (text === legacy) return { matched: true, method: "legacy-six-paragraphs" }
  // Reproduce the old importer's exact cut before normalizing, including its 1200-char limit.
  if (text === normalized(legacy.slice(0, 1200))) return { matched: true, method: "legacy-1200-character-cut" }
  const root = $(".mw-parser-output").first()
  root.find("table,blockquote,script,style,.navbox,.reflist,.references,.hatnote,.ambox,.toc,sup").remove()
  const paragraphs = normalized(root.find("p").toArray().map(node => $(node).text()).join("\n\n"))
  if (paragraphs.includes(text)) return { matched: true, method: "entire-stored-text-in-prose" }
  return { matched: false, reason: "different-text-or-older-revision" }
}

function localFlags(artist, duplicateNames = []) {
  const text = normalized(artist.bio)
  const flags = []
  if (isCalendarBio(text)) flags.push("calendar-subject")
  if (/^Termin .{1,80} ima vi[\u0161s]e zna[\u010dc]enja|^Ovaj [\u010dc]lanak sadr[\u017ez]i spisak|^YU 100:|^MESAM je skra[\u0107c]enica|^Etno-muzika\b|^Rok muzika\b|^Pop(?:ularna)? muzika\b/i.test(text)) flags.push("possible-non-artist-subject")
  if (/\uFFFD|\x00/.test(text)) flags.push("broken-encoding")
  if (duplicateNames.length > 1) flags.push("same-text-on-multiple-artist-records")
  return flags
}

async function readSource(client, language, title, expectedId) {
  if (!LANGUAGES.includes(language)) throw new Error("Unsupported Wikipedia language")
  const base = `https://${language}.wikipedia.org`
  // Same canonical URLs as the existing importer: reuse its bounded, revision-pinned cache.
  const data = await client.json(base + "/w/api.php?" + new URLSearchParams({ action: "query", titles: title, redirects: "1", prop: "pageprops|revisions", ppprop: "wikibase_item|disambiguation", rvprop: "ids|timestamp", format: "json", formatversion: "2" }))
  const page = data.query?.pages?.[0]
  if (!page || page.missing || page.ns !== 0 || page.pageprops?.wikibase_item !== expectedId || Object.hasOwn(page.pageprops || {}, "disambiguation")) return null
  const revision = page.revisions?.[0]
  if (!Number.isInteger(revision?.revid) || revision.revid <= 0 || !Number.isInteger(page.pageid) || page.pageid <= 0 || !Number.isFinite(Date.parse(revision.timestamp))) return null
  const parsed = await client.json(base + "/w/api.php?" + new URLSearchParams({ action: "parse", oldid: String(revision.revid), prop: "text|revid", format: "json", formatversion: "2" }))
  if (parsed.parse?.revid !== revision.revid || typeof parsed.parse?.text !== "string") return null
  return { html: parsed.parse.text, source: {
    language, title: page.title, pageId: page.pageid, revisionId: revision.revid, timestamp: revision.timestamp,
    url: base + "/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_")),
    revisionUrl: base + "/w/index.php?oldid=" + revision.revid,
    historyUrl: base + "/w/index.php?" + new URLSearchParams({ title: page.title, action: "history" }),
  } }
}

async function siteLicense(client, language) {
  const data = await client.json(`https://${language}.wikipedia.org/w/api.php?` + new URLSearchParams({ action: "query", meta: "siteinfo", siprop: "rightsinfo", format: "json", formatversion: "2" }))
  const rights = data.query?.rightsinfo
  if (!rights || typeof rights.url !== "string") return null
  const url = new URL(rights.url)
  if (!["http:", "https:"].includes(url.protocol) || url.hostname !== "creativecommons.org" || url.username || url.password || url.port || url.search || url.hash || !/^\/licenses\/by-sa\/4\.0(?:\/(?:deed\.[a-z-]+)?)?$/.test(url.pathname)) return null
  return { url: "https://creativecommons.org/licenses/by-sa/4.0/", sourceUrl: `https://${language}.wikipedia.org/wiki/Wikipedia:Copyrights`, label: rights.text }
}

function errorState(error) {
  if (["CACHE_MISS", "NETWORK_BUDGET", "REMOTE_PAUSED"].includes(error.code)) return "not-checked-network-needed"
  return error.status ? `http-${error.status}` : "request-failed"
}

async function inspectBiography(artist, client, licenses, duplicateNames = []) {
  const base = { id: artist.id, name: artist.name, slug: artist.slug, category: artist.category, songCount: artist.songCount,
    hash: hashValue(artist.bio), flags: localFlags(artist, duplicateNames), duplicateNames,
    excerpt: artist.bio.slice(0, 350), source: null, matched: false }
  let identity
  try { identity = await resolveMusicIdentity(artist, client) }
  catch (error) { return { ...base, state: errorState(error) } }
  if (identity.state !== "identified") return { ...base, state: "identity-" + identity.state }
  const { entity, evidence } = identity
  const result = { ...base, wikidataId: entity.id, evidence, state: "no-matching-article", checkedSources: [], errors: [] }
  for (const language of LANGUAGES) {
    const title = entity.sitelinks?.[language + "wiki"]?.title
    if (!title) continue
    try {
      const article = await readSource(client, language, title, entity.id)
      if (!article) continue
      const comparison = matchBiography(artist.bio, article.html)
      result.checkedSources.push({ title: article.source.title, language, url: article.source.revisionUrl, comparison })
      if (!comparison.matched) continue
      const license = licenses.get(language)
      if (!license) { result.state = "text-matched-license-unconfirmed"; continue }
      // Strongly suspicious non-artist or broken text stays a review item, even after matching.
      if (result.flags.some(flag => flag !== "same-text-on-multiple-artist-records")) { result.state = "text-matched-flagged"; continue }
      return { ...result, state: "source-matched", matched: true, matchMethod: comparison.method, source: {
        ...article.source, license: license.url,
        changes: "Existing legacy biography; selected prose, citation markers/whitespace normalized, Serbian Cyrillic transliterated to Latin where applicable; may be truncated at 1200 characters. Entire stored text matched against this revision. Original import date/revision is unknown; no translation or factual verification claimed.",
      } }
    } catch (error) { result.errors.push({ language, state: errorState(error) }) }
  }
  if (result.state.startsWith("text-matched")) return result
  if (result.checkedSources.length) result.state = "different-from-confirmed-artist-source"
  else if (result.errors.length) result.state = result.errors[0].state
  return result
}

function mergeCredits(manifest, artists, results) {
  const copy = structuredClone(manifest)
  const entries = new Map(copy.artists.map(entry => [entry.artistId, entry]))
  const current = new Map(artists.map(artist => [artist.id, artist]))
  const added = [], skipped = []
  for (const result of results.filter(result => result.matched && result.source && result.state === "source-matched")) {
    const artist = current.get(result.id)
    const old = entries.get(result.id)
    if (!artist || hashValue(artist.bio) !== result.hash || artist.name !== result.name || artist.slug !== result.slug || artist.category !== result.category || !/^Q\d+$/.test(result.wikidataId) || old && (old.wikidataId !== result.wikidataId || old.artistName !== artist.name || old.slug !== artist.slug || old.category !== artist.category)) {
      skipped.push({ id: result.id, reason: "identity-or-content-changed" }); continue
    }
    const source = result.source
    const base = `https://${source.language}.wikipedia.org`
    if (!LANGUAGES.includes(source.language) || !Number.isInteger(source.pageId) || source.pageId <= 0 || !Number.isInteger(source.revisionId) || source.revisionId <= 0 || !Number.isFinite(Date.parse(source.timestamp)) || typeof source.title !== "string" || !source.title || source.license !== "https://creativecommons.org/licenses/by-sa/4.0/" || source.revisionUrl !== `${base}/w/index.php?oldid=${source.revisionId}` || source.url !== base + "/wiki/" + encodeURIComponent(source.title.replace(/ /g, "_")) || source.historyUrl !== base + "/w/index.php?" + new URLSearchParams({ title: source.title, action: "history" }) || typeof source.changes !== "string" || !source.changes) {
      skipped.push({ id: result.id, reason: "invalid-source-metadata" }); continue
    }
    const entry = old || { artistId: artist.id, artistName: artist.name, slug: artist.slug, category: artist.category, wikidataId: result.wikidataId }
    entry.bio = { hash: result.hash, ...result.source }
    entries.set(artist.id, entry); added.push(artist.id)
  }
  copy.artists = [...entries.values()].sort((a, b) => a.artistName.localeCompare(b.artistName))
  return { manifest: copy, added, skipped }
}

module.exports = { normalized, legacyExtract, matchBiography, localFlags, readSource, siteLicense, inspectBiography, mergeCredits, errorState }
