const cheerio = require("cheerio")
const { WikiClient, resolveMusicIdentity, normalizeName, digest } = require("./artist-image-core.cjs")

const LANGUAGES = ["sr", "sh", "hr", "bs", "en"]
const LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/"
const letters = Object.fromEntries(Array.from("АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ").map((char, index) => [char, ["A","B","V","G","D","Đ","E","Ž","Z","I","J","K","L","Lj","M","N","Nj","O","P","R","S","T","Ć","U","F","H","C","Č","Dž","Š"][index]]))
// Serbian transliteration, not translation; album titles retain their spelling/script.
function toLatin(text) { return text.replace(/[А-Яа-яЂђЈјЉљЊњЋћЏџ]/g, char => letters[char] || letters[char.toUpperCase()]?.toLowerCase() || char) }
function clean(value) { return String(value).replace(/\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/g, "").replace(/\[n\.\s*\d+\]/g, "").replace(/\s+/g, " ").trim() }
function key(value) { return normalizeName(toLatin(value)) }
function isCalendarBio(value) { return /^\s*\d{4}\.\s+je bila (?:prosta|prestupna) godina\b/i.test(toLatin(value || "")) }
function albumKind(heading) {
  const text = key(heading)
  if (/singl|single|extended play|\beps?\b|videograf|videograph|pesme|pjesme|songs|track list|dueti|duets|hitovi|spotovi|ucesca|appearances|various artists|soundtrack|filmska muzika/.test(text)) return "skip"
  if (/studio|studij/.test(text)) return "studio"
  if (/live|koncert|uzivo/.test(text)) return "live"
  if (/kompila|compila/.test(text)) return "compilation"
  return "album"
}
function albumFromText(text, title, kind, yearNow) {
  text = clean(text)
  if (text.length > 1500) return null
  const leading = text.match(/^((?:19|20)\d{2})\.?\s*[-–—:]/)
  const datedParentheses = [...text.matchAll(/\([^()]*\b(?:19|20)\d{2}\b[^()]*\)/g)].at(-1)
  const trailing = text.match(/(?:[,–—-]\s*)((?:19|20)\d{2})\.?\s*$/)
  const metadataYears = title ? [...text.replace(title, " ").matchAll(/\b(?:19|20)\d{2}\b/g)] : []
  const year = leading?.[1] || datedParentheses?.[0].match(/\b(?:19|20)\d{2}\b/g)?.at(-1) || trailing?.[1] || (metadataYears.length === 1 ? metadataYears[0][0] : null)
  if (!year || Number(year) > yearNow) return null
  if (!title) {
    if (leading) title = text.slice(leading[0].length)
    else if (datedParentheses) title = text.slice(0, datedParentheses.index)
    else if (trailing) title = text.slice(0, trailing.index)
    else return null
    title = title.replace(/\s*\([^()]*\)\s*$/, "").replace(/,\s*(?:PGP|Jugoton|Diskoton|Croatia|City|Dallas|ПГП|Југотон|Дискотон|Кроација|Сити|Далас).*$/i, "")
  }
  title = title.replace(/\s*[-–—,]\s*$/, "")
  title = clean(title)
  for (const [opening, closing] of [['"', '"'], ['„', '“'], ['“', '”']]) {
    if (title.startsWith(opening) && title.endsWith(closing)) { title = title.slice(opening.length, -closing.length).trim(); break }
  }
  if (!title || title.length > 180 || /^(?:albums?|albumi|studio albums?|diskografija|discography|released|izdato|godina|title|naslov)$/i.test(title) || /https?:|\[object Object\]|demo album|snimljen|сингл плоча|singl ploca/i.test(title) || (kind === "album" && title.includes("/")) || title.includes("(") && !title.includes(")")) return null
  return { title, year, kind }
}

function extractArticle(html, { maxBio = 14000, yearNow = new Date().getUTCFullYear(), subjectKind = "musician" } = {}) {
  const $ = cheerio.load(html)
  const root = $(".mw-parser-output").first().length ? $(".mw-parser-output").first() : $("body")
  root.find("script,style,.infobox,.sidebar,.navbox,.vertical-navbox,.reflist,.references,.hatnote,.ambox,.toc,.metadata,.shortdescription,.mw-editsection,figure,[role=navigation]").remove()
  root.find("p").filter((_, node) => $(node).find(".citation-needed,.cn,.Inline-Template").length > 0).remove()
  root.find("sup,.reference").remove()
  const paragraphs = []; const albums = []; const albumKeys = new Set()
  let excludedLevel = null, heading = "", discLevel = null, blockedDiscLevel = null, kind = "album", bioLength = 0
  const terminal = /^(?:diskograf|discograf|discograph|filmograf|filmograph|bibliograf|bibliograph|reference|referenc|izvori|sources|literatura|literature|napomene|notes|external links|spoljasnje veze|vanjske|spoljne|see also|vidi jos|nagrade|awards|priznanja|controvers|kontrover|politic|politick|scandal|skandal|optuz|legal issues)/
  const discHeading = text => /diskograf|discograf|discograph|^(?:kompila|compila)|^(?:solo |studio |studijski |live |koncertni |compilation |kompilacijski )?album/.test(text)
  root.find("h2,h3,h4,h5,h6,p,dt,b,strong,li,tr").each((_, node) => {
    const element = $(node), tag = node.tagName.toLowerCase()
    if (element.parents(".navbox,.reflist,.infobox,.references").length) return
    if (/^h[23456]$/.test(tag)) {
      const level = Number(tag[1]), text = clean(element.text()), normalized = key(text)
      if (excludedLevel !== null && level <= excludedLevel) excludedLevel = null
      if (discLevel !== null && level <= discLevel) discLevel = null
      if (blockedDiscLevel !== null && level <= blockedDiscLevel) blockedDiscLevel = null
      if (terminal.test(normalized)) excludedLevel = level
      if (discHeading(normalized)) { if (discLevel === null) discLevel = level; kind = albumKind(text) }
      else if (discLevel !== null) { kind = "skip"; blockedDiscLevel = level }
      if (blockedDiscLevel !== null) kind = "skip"
      if (subjectKind === "musical-group" && /solo/.test(normalized)) kind = "skip"
      heading = text
      return
    }
    if (tag === "p" && excludedLevel === null && !element.parents("table,li,blockquote").length) {
      const text = toLatin(clean(element.text()))
      if (text.length < 60 || bioLength + text.length + heading.length > maxBio) return
      if (heading) { paragraphs.push(toLatin(heading)); bioLength += heading.length; heading = "" }
      paragraphs.push(text); bioLength += text.length + 2
    }
    if (discLevel !== null && blockedDiscLevel === null && ["p", "dt", "b", "strong"].includes(tag) && !element.parents("li,h2,h3,h4,h5,h6").length) {
      const label = key(element.text())
      if (label.length < 80 && /album|singl|single|kompila|compila|spotovi|ucesca|extended play|\beps?\b/.test(label)) kind = albumKind(label)
    }
    let itemKind = kind
    if (tag === "li" && element.parents("table").length) {
      const table = element.closest("table"), cell = element.closest("td,th")
      let localHeading = ""
      // One layout cell can contain studio, live and compilation sections.
      cell.find("h2,h3,h4,h5,h6,li").each((_, child) => {
        if (child === node) return false
        if (/^h[23456]$/.test(child.tagName)) localHeading = clean($(child).text())
      })
      const column = cell.parent("tr").children("td,th").index(cell)
      const headerHeading = clean(table.find("tr").first().children("td,th").eq(column).find("h2,h3,h4,h5,h6").first().text())
      const context = localHeading || headerHeading
      if (context && discHeading(key(context)) && blockedDiscLevel === null) itemKind = albumKind(context)
    }
    if (discLevel === null || itemKind === "skip" || !["li", "tr"].includes(tag) || albums.length >= 200) return
    const table = element.closest("table")
    const layoutTable = table.length && (table.find("h2,h3,h4,h5,h6").length ||
      !table.find("th").length && table.find("td > ul,td > ol").length)
    if (tag === "li" && (element.parents("li").length || table.length && !layoutTable)) return
    let text, title
    if (tag === "li") {
      const clone = element.clone(); clone.find("ul,ol").remove()
      text = clean(clone.text())
      const first = clean(clone.find("i,a").first().text())
      title = first && text.replace(/^["„“]/, "").startsWith(first) && !/^\d{4}/.test(first) ? first : ""
    } else {
      if (layoutTable || element.find("table").length) return
      const cells = element.children("td,th")
      const trackHeader = element.closest("table").hasClass("tracklist") ? cells.filter("th[colspan].mbox-text") : null
      if (element.closest("table").hasClass("tracklist") && !trackHeader?.length) return
      if (!cells.filter("td").length && !trackHeader?.length) return
      text = cells.toArray().map(cell => { const copy = $(cell).clone(); copy.find("li,p,br").after(" "); return copy.text() }).join(" ")
      title = clean(element.find("th[scope=row] i,td i").first().text())
      if (trackHeader?.length) title = clean(trackHeader.find("a,i").first().text())
      if (!title) {
        const headers = element.closest("table").find("tr").first().children("th,td").toArray().map(cell => key($(cell).text()))
        const index = headers.findIndex(value => /^(?:album|naziv|naslov|title)(?:\b|$)/.test(value))
        if (index >= 0 && cells.length === headers.length) title = clean(cells.eq(index).text())
        else return
      }
    }
    const album = albumFromText(text, title, itemKind, yearNow)
    if (!album) return
    const signature = key(album.title) + ":" + album.year
    if (!albumKeys.has(signature)) { albums.push(album); albumKeys.add(signature) }
  })
  return { bio: paragraphs.join("\n\n"), albums: albums.sort((a, b) => a.year.localeCompare(b.year) || a.title.localeCompare(b.title)) }
}

function wikipediaClient(cacheDir) { return new WikiClient({ cacheDir, extraHosts: LANGUAGES.map(lang => `${lang}.wikipedia.org`) }) }
async function readArticle(client, lang, title, expectedId, subjectKind = "musician") {
  const base = `https://${lang}.wikipedia.org`
  const data = await client.json(base + "/w/api.php?" + new URLSearchParams({ action: "query", titles: title, redirects: "1", prop: "pageprops|revisions", ppprop: "wikibase_item|disambiguation", rvprop: "ids|timestamp", format: "json", formatversion: "2" }))
  const page = data.query?.pages?.[0]
  if (!page || page.missing || page.ns !== 0 || page.pageprops?.wikibase_item !== expectedId || Object.hasOwn(page.pageprops || {}, "disambiguation")) return null
  const revision = page.revisions?.[0]
  if (!Number.isInteger(revision?.revid)) return null
  const parsed = await client.json(base + "/w/api.php?" + new URLSearchParams({ action: "parse", oldid: String(revision.revid), prop: "text|revid", format: "json", formatversion: "2" }))
  if (parsed.parse?.revid !== revision.revid || typeof parsed.parse?.text !== "string") return null
  const content = extractArticle(parsed.parse.text, { subjectKind })
  return { ...content, source: { language: lang, title: page.title, pageId: page.pageid, revisionId: revision.revid, timestamp: revision.timestamp,
    url: base + "/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_")), revisionUrl: base + "/w/index.php?oldid=" + revision.revid,
    historyUrl: base + "/w/index.php?" + new URLSearchParams({ title: page.title, action: "history" }), license: LICENSE,
    changes: "Selected prose/album entries; citations/navigation omitted; Serbian Cyrillic biography transliterated to Latin; no translation." } }
}

async function discoverContent(artist, client) {
  const resolved = await resolveMusicIdentity(artist, client)
  if (resolved.state !== "identified") return resolved
  const { entity, evidence } = resolved
  const discographyHold = require("../wiki-discography-holds.json").find(item => item.wikidataId === entity.id && normalizeName(item.name) === normalizeName(artist.name))
  let biography = null, discography = null
  const errors = []
  for (const lang of LANGUAGES) {
    const title = entity.sitelinks?.[lang + "wiki"]?.title
    if (!title) continue
    try {
      const article = await readArticle(client, lang, title, entity.id, evidence)
      if (!article) continue
      if (article.bio.length >= 200 && (!biography || (biography.bio.length < 800 && article.bio.length > biography.bio.length && lang !== "en"))) biography = article
      // Automatic publication starts with explicitly labeled studio albums only.
      // Mixed single/live lists and untyped entries remain available for manual review.
      const studioAlbums = discographyHold ? [] : article.albums.filter(album => album.kind === "studio")
      if (studioAlbums.length > (discography?.albums.length || 0)) discography = { ...article, albums: studioAlbums }
      if (biography?.bio.length >= 800 && discography?.albums.length >= 3) break
    } catch (error) { errors.push({ language: lang, state: error.status ? `http-${error.status}` : "request-failed" }) }
  }
  return { state: biography || discography ? "identified-content" : "no-content", wikidataId: entity.id, label: entity.labels?.en?.value || artist.name, evidence,
    bio: biography?.bio || null, bioSource: biography?.source || null, discography: discography?.albums || [], discographySource: discography?.source || null, discographyReview: discographyHold?.reason || null, errors }
}

function comparable(text) { return key(clean(text || "")) }
function planBio(before, candidate, reviewed = false) {
  if (!candidate || candidate.length < 200) return { action: "preserve", reason: "No confirmed readable biography" }
  if (!before?.trim() || isCalendarBio(before)) return { action: "replace", reason: before?.trim() ? "Wrong calendar article" : "Missing biography", value: candidate }
  if (reviewed) return { action: "replace", reason: "Reviewed wrong subject", value: candidate }
  const previous = comparable(before), next = comparable(candidate)
  if (previous === next) return { action: "preserve", reason: "Matches confirmed source" }
  if (before.length === 1200 && !/[.!?…]$/.test(before.trim()) && next.startsWith(previous.slice(0, 500)) && candidate.length > before.length + 300) return { action: "replace", reason: "Expand matching legacy 1200-character truncation", value: candidate }
  return { action: "preserve", reason: next.startsWith(previous.slice(0, 200)) ? "Existing biography retained" : "Different text/subject needs review" }
}

module.exports = { LANGUAGES, LICENSE, toLatin, clean, isCalendarBio, extractArticle, readArticle, discoverContent, wikipediaClient, planBio, digest }
