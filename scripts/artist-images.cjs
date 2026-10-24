const fs = require("node:fs/promises")
const path = require("node:path")
const { pathToFileURL } = require("node:url")
const { parseArgs } = require("node:util")
const { readSnapshot, readDatabase } = require("./lib/artist-image-source.cjs")
const { WikiClient, auditArtist, discoverPhoto, stagePhoto, normalizeName, localImage, safeWikiUrl } = require("./lib/artist-image-core.cjs")

const ROOT = path.resolve(__dirname, "..")
const PUBLIC = path.join(ROOT, "public")
function counts(items, field = "state") { return items.reduce((result, item) => { result[item[field]] = (result[item[field]] || 0) + 1; return result }, {}) }
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char])
function link(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? escape(url.href) : "" } catch { return "" }
}
function reviewHtml(report) {
  const cards = report.artists.filter(item => item.candidate).map(item => {
    const candidate = item.candidate
    const photo = candidate.photo
    const image = candidate.stagedFile ? escape(candidate.stagedFile) : (() => { try { return photo?.allowed ? escape(safeWikiUrl(photo.downloadUrl).href) : "" } catch { return "" } })()
    return `<article><h3>${escape(item.name)}</h3><p>${escape(item.category)} · ${escape(item.songCount ?? "?")} pesama · ${escape(candidate.state)}</p>${image ? `<img src="${image}" alt="${escape(item.name)}" loading="lazy" referrerpolicy="no-referrer">` : ""}<p>${escape(candidate.label)} — ${escape(candidate.description)}</p>${link(candidate.entityUrl) ? `<a href="${link(candidate.entityUrl)}" target="_blank" rel="noopener noreferrer">Proveri identitet na Wikidata</a>` : ""}${photo ? `<p>Fotograf: ${escape(photo.author)}<br>Licenca: ${escape(photo.license)}</p>${link(photo.filePage) ? `<a href="${link(photo.filePage)}" target="_blank" rel="noopener noreferrer">Izvor fotografije</a>` : ""}${link(photo.licenseUrl) ? ` · <a href="${link(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">Licenca</a>` : ""}<p>${escape(photo.restrictions)}</p>` : ""}${candidate.error ? `<p>${escape(candidate.error)}</p>` : ""}</article>`
  }).join("")
  const rows = report.artists.map(item => {
    let imageLink = link(item.image)
    try { const local = item.image && localImage(PUBLIC, item.image); if (local && item.state === "local-ok") imageLink = escape(pathToFileURL(local).href) } catch {}
    return `<tr data-search="${escape((item.name + " " + item.category + " " + item.state).toLowerCase())}"><td>${escape(item.name)}</td><td>${escape(item.category)}</td><td>${escape(item.songCount ?? "?")}</td><td>${escape(item.state)}</td><td>${imageLink ? `<a href="${imageLink}" target="_blank" rel="noopener noreferrer">Postojeca slika</a>` : escape(item.detail || "")}</td></tr>`
  }).join("")
  return `<!doctype html><html lang="sr-Latn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pregled fotografija izvodjaca</title><style>body{font:16px system-ui,sans-serif;background:#f5f7f8;color:#1c252b;margin:0}main{max-width:1200px;margin:auto;padding:24px}h1{font-size:28px}a{color:#075f91}p{line-height:1.6;overflow-wrap:anywhere}.notice{border-left:4px solid #b45309;padding:12px 16px;background:#fff}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px;margin:24px 0}article{min-width:0;border:1px solid #c5cfd6;background:white;padding:16px;border-radius:6px}article img{display:block;width:100%;height:260px;object-fit:contain;background:#eaf0f3}article h3{overflow-wrap:anywhere}input{font:inherit;padding:12px;border:1px solid #9ca3af;max-width:100%;box-sizing:border-box}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{text-align:left;padding:10px;border-bottom:1px solid #c5cfd6}td{overflow-wrap:anywhere}.table{overflow-x:auto}pre{white-space:pre-wrap}</style><main><h1>Fotografije izvodjaca</h1><p class="notice">Ovo je samo pregled. Nijedna slika, biografija ili drugi podatak u bazi nije izmenjen.${report.source.kind === "snapshot" ? " PAZNJA: podaci su iz rezervne kopije, ne iz trenutne baze." : " Podaci su procitani iz trenutne baze."}</p><p>Datum pregleda: ${escape(report.createdAt)} · Izvodjaca: ${report.artists.length}</p><pre>${escape(JSON.stringify(report.summary, null, 2))}</pre>${cards ? `<h2>Predlozi za proveru</h2><p>Proveri pravi bend/osobu, kvalitet i uslove koriscenja pre objave. Fotografije nisu automatski objavljene.</p><section class="gallery">${cards}</section>` : ""}<h2>Svi izvodjaci</h2><label>Pretraga <input id="filter" type="search" placeholder="Izvodjac, kategorija ili status..."></label><div class="table"><table><thead><tr><th>Izvodjac</th><th>Kategorija</th><th>Pesme</th><th>Status</th><th>Fotografija / napomena</th></tr></thead><tbody>${rows}</tbody></table></div></main><script>document.getElementById('filter').addEventListener('input',function(){var q=this.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(function(r){r.hidden=!r.dataset.search.includes(q)})})</script></html>`
}

async function writeReport(directory, report) {
  report.summary = { assigned: report.artists.filter(item => item.image?.trim()).length, images: counts(report.artists), candidates: counts(report.artists.filter(item => item.candidate).map(item => item.candidate)) }
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2))
  await fs.writeFile(path.join(directory, "index.html"), reviewHtml(report))
}

async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    ca: { type: "string" }, snapshot: { type: "string" }, "report-dir": { type: "string" },
    "check-remote": { type: "boolean", default: false }, download: { type: "boolean", default: false },
    balanced: { type: "boolean", default: false },
    limit: { type: "string", default: "12" }, name: { type: "string", multiple: true }, category: { type: "string" },
  } })
  const command = positionals[0] || "audit"
  if (!["audit", "discover"].includes(command) || positionals.length > 1) throw new Error("Use audit or discover; this tool cannot modify the database")
  const limit = Number(values.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("--limit must be between 1 and 100")
  if (values.category && !["domace", "narodne", "strane"].includes(values.category)) throw new Error("Invalid category")
  for (const file of [".env.local", ".env"]) require("dotenv").config({ path: path.join(ROOT, file), quiet: true })
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("Unsafe TLS override is not supported")
  const directory = path.resolve(values["report-dir"] || path.join(ROOT, "reports", "artist-images", new Date().toISOString().replace(/[:.]/g, "-")))
  const client = new WikiClient({ cacheDir: path.join(ROOT, "reports", "artist-images", "cache") })
  const loaded = values.snapshot ? await readSnapshot(path.resolve(values.snapshot)) : await readDatabase(values.ca)
  const report = { version: 1, createdAt: new Date().toISOString(), source: loaded.source, artists: [] }
  console.log(`Read ${loaded.artists.length} artists from ${loaded.source.kind}; auditing without database writes.`)
  for (const artist of loaded.artists) {
    report.artists.push(await auditArtist(artist, { publicRoot: PUBLIC, client, checkRemote: values["check-remote"] }))
  }
  await writeReport(directory, report)
  console.log("Audit:", JSON.stringify(report.summary))
  if (command === "discover") {
    const names = values.name?.map(normalizeName)
    const sorted = report.artists.filter(item => item.state === "missing" && (!values.category || item.category === values.category) && (!names || names.includes(normalizeName(item.name))))
      .sort((a, b) => (b.songCount ?? 0) - (a.songCount ?? 0) || a.name.localeCompare(b.name))
    let eligible = sorted.slice(0, limit)
    if (values.balanced && !values.category && !names) {
      eligible = []
      const groups = ["domace", "narodne", "strane"].map(category => sorted.filter(item => item.category === category))
      for (let index = 0; eligible.length < limit && groups.some(group => index < group.length); index++) {
        for (const group of groups) if (group[index] && eligible.length < limit) eligible.push(group[index])
      }
    }
    for (const [index, item] of eligible.entries()) {
      console.log(`[${index + 1}/${eligible.length}] ${item.name}`)
      try {
        item.candidate = await discoverPhoto(item, client)
        if (values.download && item.candidate.state === "review-ready") {
          try { item.candidate.stagedFile = "staged/" + await stagePhoto(item.candidate, path.join(directory, "staged"), client) }
          catch { item.candidate.downloadError = "Could not prepare preview; no database change" }
        }
      } catch (error) { item.candidate = { state: "request-failed", error: error.status ? `Wikimedia HTTP ${error.status}` : "Network or metadata check failed; retry later" } }
      await writeReport(directory, report)
      console.log("  ->", item.candidate.state)
    }
  }
  console.log("Report:", path.join(directory, "index.html"))
  return report
}

if (require.main === module) main().catch(error => { console.error("Artist image audit stopped:", error.code || error.name, "/ check CA/connection, input and permissions; credentials are not logged."); process.exitCode = 1 })
module.exports = { main, reviewHtml, writeReport, counts }
