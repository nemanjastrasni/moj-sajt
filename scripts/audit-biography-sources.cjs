/* eslint-disable @typescript-eslint/no-require-imports -- Read-only CommonJS maintenance CLI. */
const fs = require("node:fs/promises")
const path = require("node:path")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { WikiClient } = require("./lib/artist-image-core.cjs")
const { LANGUAGES } = require("./lib/artist-wiki-core.cjs")
const { readArtists, hashValue } = require("./artist-wiki.cjs")
const { inspectBiography, siteLicense, mergeCredits } = require("./lib/biography-provenance.cjs")
const ROOT = path.resolve(__dirname, "..")
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char])

function boundedClient(networkBudget) {
  const stats = { requests: 0, cacheOnly: true, paused: false }
  const client = new WikiClient({ cacheDir: path.join(ROOT, "reports/artist-images/cache"), interval: 600,
    extraHosts: LANGUAGES.map(language => `${language}.wikipedia.org`), request: async (url, options) => {
      if (stats.cacheOnly || stats.requests >= networkBudget || stats.paused) throw Object.assign(new Error("Network unavailable within this pass"), { code: stats.cacheOnly ? "CACHE_MISS" : stats.paused ? "REMOTE_PAUSED" : "NETWORK_BUDGET" })
      stats.requests++
      const response = await fetch(url, { ...options, headers: { ...options.headers, "User-Agent": "GitaraAkordiBiographyAudit/1.0 (https://github.com/nemanjastrasni/moj-sajt; legacy source review)" } })
      if ([429, 503].includes(response.status)) stats.paused = true
      return response
    } })
  // A failed offline lookup must not poison later online identity checks.
  const originalEntity = client.entity.bind(client)
  client.entity = async id => { try { return await originalEntity(id) } catch (error) { client.entities.delete(id); throw error } }
  const originalBytes = client.bytes.bind(client)
  client.bytes = (...args) => {
    if (stats.cacheOnly || stats.requests >= networkBudget || stats.paused) return Promise.reject(Object.assign(new Error("Network unavailable within this pass"), { code: stats.cacheOnly ? "CACHE_MISS" : stats.paused ? "REMOTE_PAUSED" : "NETWORK_BUDGET" }))
    return originalBytes(...args)
  }
  return { client, stats }
}

function needsLiveCheck(result) {
  return ["not-checked-network-needed", "request-failed"].includes(result.state) || (result.errors || []).some(error => ["not-checked-network-needed", "request-failed"].includes(error.state))
}

function html(summary, rows, page, pages) {
  const labels = { "source-matched": "Potvrdjeno poklapanje celog teksta sa izvorom", "different-from-confirmed-artist-source": "Tekst se razlikuje od potvrdjenog izvora: proveriti", "not-checked-network-needed": "Potrebna dodatna mrezna provera", "identity-not-found": "Identitet nije pouzdano pronadjen", "identity-ambiguous": "Vise mogucih identiteta", "text-matched-flagged": "Poklapanje sa upozorenjem: rucna provera" }
  const nav = `<nav><a href="index.html">Pocetak</a>${page > 1 ? `<a href="${page === 2 ? "index.html" : `page-${page - 1}.html`}">Prethodna</a>` : ""}${page < pages ? `<a href="page-${page + 1}.html">Sledeca</a>` : ""}<a href="report.json">JSON izvestaj</a></nav>`
  const flags = { "possible-non-artist-subject": "Moguce da tekst nije biografija ovog izvodjaca", "same-text-on-multiple-artist-records": "Isti tekst postoji kod vise zapisa izvodjaca", "calendar-subject": "Tekst o kalendarskoj godini", "broken-encoding": "Osteceni znakovi u tekstu" }
  const items = rows.map(row => `<section><h2>${escape(row.name)}</h2>
    <p class="${row.matched ? "pass" : "warn"}">${escape(labels[row.state] || row.state)}</p>
    <p>${row.songCount} pesama; ${escape(row.category)}${row.wikidataId ? `; ${escape(row.wikidataId)}` : ""}</p>
    <p>ID: ${escape(row.id)}<br>Adresa izvodjaca: ${escape(row.slug)}</p>
    <p>${escape(row.flags.map(flag => flags[flag] || flag).join("; "))}</p>
    <p class="excerpt">${escape(row.excerpt)}</p>
    ${row.source ? `<a href="${escape(row.source.revisionUrl)}">Potvrdjena Wikipedia revizija</a>` : ""}
    <details><summary>Pregledani izvori i duplikati</summary><ul>${(row.checkedSources || []).map(source => `<li><a href="${escape(source.url)}">${escape(source.title)} (${escape(source.language)})</a>: ${escape(source.comparison.method || source.comparison.reason)}</li>`).join("")}</ul><p>${escape(row.duplicateNames.join("; "))}</p></details></section>`).join("")
  return `<!doctype html><html lang="sr-Latn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Izvori biografija</title>
    <style>body{font:15px/1.6 system-ui;margin:0;background:#f4f6f8;color:#1b2630}main{max-width:1040px;margin:auto;padding:24px 16px}section{padding:20px 0;border-top:1px solid #bbc6cf}h1{font-size:26px}h2{font-size:20px}p,li{overflow-wrap:anywhere}a{color:#075c9a}nav{display:flex;flex-wrap:wrap;gap:18px}.excerpt{white-space:pre-wrap}.pass{color:#16703b}.warn{color:#9c440b}</style>
    <main><h1>Izvori starih biografija</h1>
    <p>Lokalno obradjeno ${summary.biographies} biografija; ${summary.matched} sa potvrdom izvora; ${summary.needsReview} za dalju proveru. Baza nije menjana. Poklapanje teksta i identiteta nije nezavisna potvrda svih biografskih cinjenica ili svih prava.</p>
    <p>${summary.states?.["not-checked-network-needed"] || 0} zapisa zahteva dodatnu mreznu proveru. Strana ${page} / ${pages}. Spisak prvo prikazuje upozorenja. Nepoklapanje nije automatski dokaz greske: moguca je ranija verzija clanka.</p>
    ${nav}${items}${nav}</main></html>`
}

async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, "report-dir": { type: "string" }, "network-budget": { type: "string", default: "150" }, "live-limit": { type: "string", default: "60" }, "prepare-credits": { type: "boolean", default: false } } })
  const budget = Number(values["network-budget"]), limit = Number(values["live-limit"])
  if (![budget, limit].every(value => Number.isInteger(value) && value >= 0 && value <= 1000)) throw Error("Limits must be 0..1000")
  loadEnvConfig(ROOT)
  const artists = await readArtists(values.ca)
  const biographies = artists.filter(artist => artist.bio?.trim()).sort((a, b) => b.songCount - a.songCount || a.id.localeCompare(b.id))
  const manifestPath = path.join(ROOT, "public/artist-wiki/manifest.json")
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))
  const directory = path.resolve(ROOT, values["report-dir"] || `reports/artist-wiki/provenance-${new Date().toISOString().replace(/[:.]/g, "-")}`)
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(path.join(directory, "before.json"), JSON.stringify({ createdAt: new Date().toISOString(), artists }, null, 2), { flag: "wx" })
  const duplicateMap = new Map()
  for (const artist of biographies) {
    const key = hashValue(artist.bio)
    if (!duplicateMap.has(key)) duplicateMap.set(key, [])
    duplicateMap.get(key).push(artist.name)
  }
  const { client, stats } = boundedClient(budget)
  const licenses = new Map()
  stats.cacheOnly = false
  for (const language of LANGUAGES) {
    try { const license = await siteLicense(client, language); if (license) licenses.set(language, license) } catch {}
  }
  stats.cacheOnly = true
  const results = []
  for (const artist of biographies) {
    results.push(await inspectBiography(artist, client, licenses, duplicateMap.get(hashValue(artist.bio))))
    if (results.length % 100 === 0) console.log(`Cached/source scan ${results.length}/${biographies.length}`)
  }
  await fs.writeFile(path.join(directory, "cache-pass.json"), JSON.stringify(results, null, 2))
  stats.cacheOnly = false
  let liveAttempts = 0
  for (const [index, artist] of biographies.entries()) {
    if (results[index].matched || !needsLiveCheck(results[index])) continue
    if (liveAttempts >= limit || stats.requests >= budget || stats.paused) break
    liveAttempts++
    console.log(`Live check ${liveAttempts}/${limit}: ${artist.name}`)
    results[index] = await inspectBiography(artist, client, licenses, duplicateMap.get(hashValue(artist.bio)))
    await fs.writeFile(path.join(directory, "progress.json"), JSON.stringify({ results, liveAttempts, networkRequests: stats.requests }, null, 2))
  }
  const states = {}, flagCounts = {}
  for (const result of results) {
    states[result.state] = (states[result.state] || 0) + 1
    for (const flag of result.flags) flagCounts[flag] = (flagCounts[flag] || 0) + 1
  }
  const summary = { checkedAt: new Date().toISOString(), artists: artists.length, biographies: biographies.length, matched: results.filter(row => row.matched).length, needsReview: results.filter(row => !row.matched).length,
    states, flagCounts, confirmedLicenseLanguages: [...licenses.keys()], liveAttempts, networkRequests: stats.requests, networkBudget: budget, remotePaused: stats.paused, databaseWrites: 0 }
  const sorted = [...results].sort((a, b) => Number(b.flags.some(flag => flag !== "same-text-on-multiple-artist-records")) - Number(a.flags.some(flag => flag !== "same-text-on-multiple-artist-records")) || Number(a.matched) - Number(b.matched) || b.songCount - a.songCount)
  if (values["prepare-credits"]) {
    // Fresh read prevents an intervening manual edit from getting another text's source label.
    const fresh = await readArtists(values.ca)
    const merged = mergeCredits(manifest, fresh, results)
    if (await fs.readFile(manifestPath, "utf8") !== JSON.stringify(manifest, null, 2) + "\n") {
      const current = JSON.parse(await fs.readFile(manifestPath, "utf8"))
      if (JSON.stringify(current) !== JSON.stringify(manifest)) throw Error("Source manifest changed during audit")
    }
    await fs.writeFile(path.join(directory, "manifest-before.json"), JSON.stringify(manifest, null, 2))
    await fs.writeFile(manifestPath, JSON.stringify(merged.manifest, null, 2) + "\n")
    await fs.writeFile(path.join(directory, "credits-prepared.json"), JSON.stringify({ added: merged.added, skipped: merged.skipped }, null, 2))
    summary.creditsPrepared = merged.added.length
    summary.creditsSkipped = merged.skipped.length
  }
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify({ summary, results: sorted }, null, 2))
  const pages = Math.max(1, Math.ceil(sorted.length / 100))
  for (let page = 1; page <= pages; page++) await fs.writeFile(path.join(directory, page === 1 ? "index.html" : `page-${page}.html`), html(summary, sorted.slice((page - 1) * 100, page * 100), page, pages))
  console.log(JSON.stringify({ ...summary, report: path.join(directory, "index.html") }, null, 2))
}
if (require.main === module) main().catch(error => { console.error("Biography provenance scan stopped:", error.code || error.name, "/ no database writes are supported"); process.exitCode = 1 })
module.exports = { boundedClient, html, needsLiveCheck }
