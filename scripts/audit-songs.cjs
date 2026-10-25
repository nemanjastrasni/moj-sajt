const fs = require("node:fs/promises")
const { existsSync } = require("node:fs")
const path = require("node:path")
const { performance } = require("node:perf_hooks")
const { parseArgs } = require("node:util")
const { databaseClient } = require("./lib/artist-image-source.cjs")
const { hash, songKey, selectSample, createAuditor, escapeHtml: h, csvCell } = require("./lib/song-audit.cjs")
const root = path.resolve(__dirname, "..")

async function sourceIndex(directories) {
  const index = new Map()
  const roots = []
  async function walk(directory, base) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) await walk(file, base)
      else if (entry.isFile() && /\.txt$/i.test(entry.name)) {
        const name = entry.name.slice(0, -4)
        const split = name.indexOf(" - ")
        if (split < 1) continue
        const key = songKey(name.slice(0, split), name.slice(split + 3))
        if (!index.has(key)) index.set(key, [])
        index.get(key).push({ file, archive: path.basename(base) })
      }
    }
  }
  for (const directory of [...new Set(directories.map(directory => path.resolve(directory)))]) {
    await walk(directory, directory)
    roots.push(directory)
  }
  return { index, roots }
}

async function readSongs(ca) {
  require("@next/env").loadEnvConfig(root)
  const db = await databaseClient(ca)
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const { rows: [mode] } = await db.query("SHOW transaction_read_only")
    if (mode.transaction_read_only !== "on") throw new Error("Read-only transaction required")
    const { rows } = await db.query('SELECT s.id, s.title, s.slug, s.category, s.lyrics, s.chords, a.name AS artist, a.slug AS "artistSlug", r.status AS "reviewStatus" FROM public."Song" s JOIN public."Artist" a ON a.id = s."artistId" LEFT JOIN public."SongReview" r ON r."songId" = s.id ORDER BY s.id')
    await db.query("COMMIT")
    return rows
  } finally { await db.end() }
}

const labels = { technical_pass: "Tehnicka provera prosla", needs_attention: "Za pregled", exact_local_match: "Isti lokalni tekst", same_parsed_layout: "Isti parsirani raspored", different: "Razlikuje se od lokalnih verzija", not_found: "Nema pouzdanog para u arhivi" }
const issueLabels = { empty_content: "Prazan tekst", missing_metadata: "Nedostaje naziv", encoding: "Osteceni znakovi", html_residue: "Zaostao HTML", no_recognized_chords: "Nema prepoznatih akorda", unparsed_musical_line: "Muzicki red nije potpuno prepoznat", unparsed_inline_chord: "Neprepoznat akord u tekstu", possible_duplicated_words: "Moguce ponovljene reci", chord_far_after_lyric: "Proveriti poziciju akorda", missing_diagram: "Nedostaje dijagram", transpose_failure: "Greska transponovanja", wrap_failure: "Greska prelamanja" }

function priority(row) {
  return row.issues.some(issue => issue.severity === "error") ? 4 : row.issues.some(issue => issue.code === "unparsed_musical_line" || issue.code === "unparsed_inline_chord") ? 3 : row.outcome === "needs_attention" ? 2 : row.source.state === "different" ? 1 : 0
}

function renderHtml(summary, results, baseUrl, navigation = "") {
  return `<!doctype html><html lang="sr-Latn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Provera pesama</title><style>
body{margin:0;background:#f5f6f8;color:#20252c;font:15px/1.5 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px 16px}h1{font-size:26px}h2{font-size:20px}a{color:#075ba6;overflow-wrap:anywhere}section{border-top:1px solid #c7cdd6;padding:18px 0}summary{cursor:pointer;font-weight:600}li{margin:8px 0;overflow-wrap:anywhere}code{white-space:pre-wrap;overflow-wrap:anywhere}p{max-width:850px}.status{font-weight:600}.warning{color:#8c3706}.pass{color:#17613c}nav{display:flex;gap:18px;flex-wrap:wrap}.meta{color:#53606f}details{margin-top:12px}h3{font-size:17px;margin:0}small{display:block}*{box-sizing:border-box}
</style><main><h1>Provera pesama: ${summary.audited} / ${summary.totalSongs}</h1><p>Ovo je automatski tehnicki pregled, ne potvrda muzicke tacnosti. Lokalna arhiva moze sadrzati iste greske kao baza. Nisu menjani tekstovi, akordi ni rucni statusi.</p><p>${summary.technicalPass} proslo tehnicke testove; ${summary.needsAttention} za pregled. ${summary.sourceConfirmedCandidates} bez pronadjenih upozorenja i sa jednim saglasnim lokalnim sadrzajem. To nisu automatski verifikovane pesme.</p><p class="meta">${h(summary.mode)}; ${h(summary.createdAt)}.${summary.mode === "all" ? " Pregled cele trenutne baze." : " Uzorak je namenski raznovrstan, nije statisticka procena cele baze."}</p><nav><a href="index.html">Sve pesme</a><a href="queue-1.html">Samo za pregled</a><a href="candidates-1.html">Kandidati sa lokalnim poklapanjem</a><a href="queue.csv">CSV za pregled</a><a href="results.json">Detaljni rezultati</a></nav>${navigation}<h2>Pesme i nalazi</h2>${results.map(row => `<section><h3><a target="_blank" rel="noreferrer" href="${h(baseUrl + row.href)}">${h(row.artist)} - ${h(row.title || "(bez naziva)")}</a></h3><p class="status ${row.outcome === "technical_pass" ? "pass" : "warning"}">${labels[row.outcome]}</p><p class="meta">Rucna oznaka: ${h(row.manualStatus)}; ${row.chordCount} prepoznatih akorda; izvor: ${labels[row.source.state]}${row.source.conflictingLocalVersions ? "; postoji vise razlicitih lokalnih verzija" : ""}.</p><a target="_blank" rel="noreferrer" href="${h(baseUrl + row.editHref)}">Otvori admin editor</a>${row.issues.length ? `<ul>${row.issues.map(issue => `<li><strong>${h(issueLabels[issue.code] || issue.code)}</strong>${issue.line ? `, red ${issue.line}` : ""}: <code>${h(issue.detail)}</code> (${issue.severity === "error" ? "greska" : issue.severity === "note" ? "napomena" : "upozorenje"})</li>`).join("")}</ul>` : ""}<details><summary>Akordi i lokalne datoteke</summary><p>${h(row.chords.join(" "))}</p>${row.source.files.map(file => `<small>${h(file)}</small>`).join("")}</details></section>`).join("")}${navigation}</main></html>`
}

async function run() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, sources: { type: "string", multiple: true }, sample: { type: "string", default: "200" }, all: { type: "boolean", default: false }, "base-url": { type: "string", default: "https://moj-sajt-rho.vercel.app" } } })
  const base = new URL(values["base-url"])
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error("Expected an HTTP(S) origin without credentials or path")
  const count = Number(values.sample)
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid sample count")
  const start = performance.now()
  const songs = await readSongs(values.ca)
  const selected = values.all ? songs : selectSample(songs, count)
  const source = await sourceIndex(values.sources || [])
  const audit = createAuditor(url => existsSync(path.join(root, "public", decodeURIComponent(url))))
  const results = []
  const cache = new Map()
  for (const song of selected) {
    const candidates = []
    for (const candidate of source.index.get(songKey(song.artist, song.title)) || []) {
      if (!cache.has(candidate.file)) cache.set(candidate.file, await fs.readFile(candidate.file, "utf8"))
      candidates.push({ ...candidate, text: cache.get(candidate.file) })
    }
    results.push(audit(song, candidates))
    if (results.length % 500 === 0 || results.length === selected.length) console.log(`Audited ${results.length}/${selected.length}; database is read-only`)
  }
  const issueCounts = {}
  const sourceCounts = {}
  const categoryCounts = {}
  const missingDiagrams = {}
  for (const row of results) {
    sourceCounts[row.source.state] = (sourceCounts[row.source.state] || 0) + 1
    categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1
    for (const code of new Set(row.issues.map(issue => issue.code))) issueCounts[code] = (issueCounts[code] || 0) + 1
    for (const issue of row.issues.filter(issue => issue.code === "missing_diagram")) missingDiagrams[issue.detail] = (missingDiagrams[issue.detail] || 0) + 1
  }
  const summary = {
    formatVersion: 1, createdAt: new Date().toISOString(), mode: values.all ? "all" : "stratified-pilot",
    readOnly: true, databaseWrites: 0, manualStatusesChanged: 0,
    totalSongs: songs.length, audited: results.length,
    snapshotHash: hash(JSON.stringify(songs.map(song => [song.id, song.lyrics, song.chords, song.reviewStatus]))),
    technicalPass: results.filter(row => row.outcome === "technical_pass").length,
    needsAttention: results.filter(row => row.outcome === "needs_attention").length,
    sourceConfirmedCandidates: results.filter(row => row.sourceConfirmedCandidate).length,
    queueCount: results.filter(row => row.outcome === "needs_attention" || row.source.state === "different").length,
    sourceCounts, categoryCounts, issueCounts, missingDiagrams, sourceRoots: source.roots,
    elapsedSeconds: Math.round((performance.now() - start) / 100) / 10,
    limitations: ["Not musical verification", "Local archives can repeat scraper errors", "No live source requests", "Wrapping tests are source-column invariants, not screenshots of every song", "Missing diagrams do not imply wrong chord notation", "Local-version differences may be intentional corrections", "Pilot distribution cannot be extrapolated as database percentages"],
  }
  const output = path.join(root, "reports", "song-audits", `${summary.mode}-${summary.createdAt.replace(/[:.]/g, "-")}`)
  await fs.mkdir(output, { recursive: true })
  await fs.writeFile(path.join(output, "summary.json"), JSON.stringify(summary, null, 2))
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2))
  const columns = ["artist", "title", "category", "outcome", "manualStatus", "href", "editHref", "sourceState", "issues"]
  const sorted = [...results].sort((a, b) => priority(b) - priority(a) || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
  const queue = sorted.filter(row => row.outcome === "needs_attention" || row.source.state === "different")
  const csv = [columns.map(csvCell).join(","), ...queue.map(row => [row.artist, row.title, row.category, row.outcome, row.manualStatus, base.origin + row.href, base.origin + row.editHref, row.source.state, row.issues.map(issue => `${issue.code}${issue.line ? ` (red ${issue.line})` : ""}: ${issue.detail}`).join(" | ")].map(csvCell).join(","))].join("\r\n")
  await fs.writeFile(path.join(output, "queue.csv"), "\uFEFF" + csv)
  for (const [prefix, rows] of [["all", sorted], ["queue", queue], ["candidates", sorted.filter(row => row.sourceConfirmedCandidate)]]) {
    const pages = Math.max(1, Math.ceil(rows.length / 200))
    const filename = page => prefix === "all" && page === 1 ? "index.html" : `${prefix}-${page}.html`
    for (let page = 1; page <= pages; page++) {
      const navigation = `<p>${prefix === "queue" ? "Za pregled (ukljucuje razlike od arhive)" : prefix === "candidates" ? "Kandidati za naknadnu potvrdu, ne rucno proverene pesme" : "Sve pesme"}: ${rows.length}; strana ${page} / ${pages}.</p><nav>${page > 1 ? `<a href="${filename(page - 1)}">Prethodna</a>` : ""}${page < pages ? `<a href="${filename(page + 1)}">Sledeca</a>` : ""}</nav>`
      await fs.writeFile(path.join(output, filename(page)), renderHtml(summary, rows.slice((page - 1) * 200, page * 200), base.origin, navigation))
    }
  }
  console.log(JSON.stringify({ ...summary, output }, null, 2))
}

if (require.main === module) run().catch(error => { console.error(`Audit failed (${error.code || error.name}); no database writes were attempted.`); process.exitCode = 1 })
module.exports = { sourceIndex, readSongs, renderHtml }
