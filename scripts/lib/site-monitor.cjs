/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node monitor; no app or database imports. */
const { load } = require('cheerio')
const { createHash } = require('node:crypto')

const USER_AGENT = 'GitarAkordiMonitor/1.0 HeadlessChrome (read-only health checks)'
const MAX_BODY = 4 * 1024 * 1024
const PRIVATE_PATH = /^\/(?:admin|api|profile|favorite|login|signin|signup|predlozi-pesmu|moji-predlozi|listening-playlist)(?:\/|$)/
const PUBLIC_PATH = /^\/(?:pesme|biografija|akordi|plejliste|top-50|o-nama|kontakt|foto-izvori|wiki-izvori|prijava-povrede)(?:\/|$)/
const CATALOG_SLUGS = new Set(['veoma-lako', 'lako', 'srednje', 'tesko', 'veoma-tesko', '4-akorda', 'beginner', 'acoustic', 'domace', 'strane', 'narodne'])

function originUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || /^(?:localhost|\[|\d+(?:\.|$))/.test(url.hostname) || /\.(?:local|internal)$/.test(url.hostname)) throw Error('Invalid public HTTPS origin')
  return url.origin
}
function publicPath(value, origin) {
  try {
    const url = new URL(value)
    if (url.origin !== origin || url.search || url.hash || url.username || url.password || !PUBLIC_PATH.test(url.pathname) && url.pathname !== '/' && url.pathname !== '/public-listening-playlists') return null
    const decoded = decodeURIComponent(url.pathname)
    if (PRIVATE_PATH.test(decoded) || /^\/plejliste\/(?:pesme-koje-znam|top-user)(?:\/|$)/.test(decoded) || /[\u0000-\u001f\\]/.test(decoded)) return null
    if (decoded.startsWith('/plejliste/') && !CATALOG_SLUGS.has(decoded.slice('/plejliste/'.length))) return null
    return url.pathname
  } catch { return null }
}
function robotsAllows(source, path) {
  let agents = [], rules = [], hasRules = false
  const selected = []
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim(), match = /^(user-agent|allow|disallow):\s*(.*)$/i.exec(line)
    if (!match) continue
    const key = match[1].toLowerCase(), value = match[2].trim()
    if (key === 'user-agent') {
      if (hasRules) { if (agents.includes('*')) selected.push(...rules); agents = []; rules = []; hasRules = false }
      agents.push(value.toLowerCase())
    } else { hasRules = true; if (value) rules.push({ allow: key === 'allow', value }) }
  }
  if (agents.includes('*')) selected.push(...rules)
  let best = { score: -1, allow: true }
  for (const rule of selected) {
    const end = rule.value.endsWith('$'), pattern = rule.value.replace(/\$$/, '').split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
    if (new RegExp('^' + pattern + (end ? '$' : '')).test(path)) {
      const score = rule.value.replace(/[*$]/g, '').length
      if (score > best.score || score === best.score && rule.allow) best = { score, allow: rule.allow }
    }
  }
  return best.allow
}
async function fetchText(url, { fetcher = fetch, timeoutMs = 12000, maxBytes = MAX_BODY, retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetcher(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': USER_AGENT, Accept: 'text/html, application/xml, text/plain' }, signal: AbortSignal.timeout(timeoutMs) })
      if ([429, 502, 503, 504].includes(response.status) && attempt < retries) { await response.body?.cancel(); continue }
      if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); throw Error('body-limit') }
      const reader = response.body?.getReader(), parts = []; let size = 0
      if (reader) try {
        for (;;) {
          const { done, value } = await reader.read(); if (done) break
          size += value.byteLength
          if (size > maxBytes) { await reader.cancel(); throw Error('body-limit') }
          parts.push(value)
        }
      } finally { reader.releaseLock() }
      return { status: response.status, headers: response.headers, text: Buffer.concat(parts).toString('utf8'), bytes: size }
    } catch (error) {
      if (attempt < retries && error.message !== 'body-limit') continue
      // Remote exception messages and bodies never enter a report or the AI input.
      return { status: 0, headers: new Headers(), text: '', bytes: 0, error: error.message === 'body-limit' ? 'body-limit' : 'network-or-timeout' }
    }
  }
}
function samples(urls, count, day) {
  if (!urls.length) return []
  const offset = createHash('sha256').update(day).digest().readUInt32BE(0) % urls.length
  return [...new Set(Array.from({ length: Math.min(count, urls.length) }, (_, index) => urls[(offset + Math.floor(index * urls.length / Math.min(count, urls.length))) % urls.length]))]
}
function schemaTypes(value) {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(schemaTypes)
  return [...(Array.isArray(value['@type']) ? value['@type'] : typeof value['@type'] === 'string' ? [value['@type']] : []), ...schemaTypes(value['@graph'])]
}

async function inspectSite({ origin: input, now = new Date(), fetcher = fetch, sampleSize = 12, timeoutMs = 12000 } = {}) {
  const origin = originUrl(input), checks = [], paths = new Set(), report = {
    formatVersion: 1, mode: 'observe-only', origin, startedAt: now.toISOString(), finishedAt: null, status: 'healthy',
    coverage: { sitemapFiles: 0, sitemapUrls: 0, songUrls: 0, pagesChecked: 0, requests: 0, responseBytes: 0 }, checks,
    ai: { status: 'not-requested' }, databaseWrites: 0, sourceWrites: 0,
  }
  const add = (level, code, path, message, evidence = {}) => checks.push({ id: `check-${checks.length + 1}`, level, code, path, message, ...evidence })
  const request = async path => {
    if (report.coverage.requests >= 100 || report.coverage.responseBytes > 32 * 1024 * 1024) throw Error('monitor-budget-exceeded')
    report.coverage.requests++
    const result = await fetchText(origin + path, { fetcher, timeoutMs }); report.coverage.responseBytes += result.bytes
    return result
  }
  try {
    const robots = await request('/robots.txt')
    if (robots.status !== 200) add('critical', 'robots_http', '/robots.txt', 'Robots datoteka nije dostupna.', {httpStatus:robots.status})
    else if (!robots.text.split(/\r?\n/).some(line => /^sitemap:/i.test(line) && line.slice(line.indexOf(':') + 1).trim() === origin + '/sitemap.xml')) add('warning', 'robots_sitemap', '/robots.txt', 'Robots ne navodi sitemap na izabranom domenu.')
    const index = await request('/sitemap.xml')
    if (index.status !== 200) add('critical', 'sitemap_http', '/sitemap.xml', 'Sitemap indeks nije dostupan.', {httpStatus:index.status})
    else {
      const $ = load(index.text, { xmlMode: true }), files = $('sitemapindex > sitemap > loc').map((_, node) => $(node).text().trim()).get()
      if (!files.length || files.length > 64 || new Set(files).size !== files.length) add('critical', 'sitemap_index', '/sitemap.xml', 'Sitemap indeks je prazan, prevelik ili ponavlja datoteke.')
      else for (const file of files) {
        let url
        try { url = new URL(file) } catch { /* Invalid URLs are reported without fetching them. */ }
        if (!url || url.origin !== origin || url.search || url.hash || !/^\/sitemaps\/(?:pages|songs-\d+|artists-\d+)\.xml$/.test(url.pathname)) { add('critical', 'sitemap_origin', '/sitemap.xml', 'Sitemap sadrži neočekivanu adresu datoteke.'); continue }
        const result = await request(url.pathname); report.coverage.sitemapFiles++
        if (result.status !== 200) { add('critical', 'sitemap_partition_http', url.pathname, 'Deo sitemapa nije dostupan.', {httpStatus:result.status}); continue }
        const xml = load(result.text, { xmlMode: true }), urls = xml('urlset > url > loc').map((_, node) => xml(node).text().trim()).get()
        if (!urls.length) add('warning', 'empty_sitemap', url.pathname, 'Deo sitemapa nema javne adrese.')
        if (urls.length > 50000) { add('critical', 'oversized_sitemap', url.pathname, 'Deo sitemapa ima previše adresa.'); continue }
        for (const value of urls) {
          const path = publicPath(value, origin)
          if (!path) { add('critical', 'sitemap_private_or_foreign', url.pathname, 'Sitemap navodi privatnu ili neispravnu javnu adresu.'); continue }
          if (paths.has(path)) add('warning', 'sitemap_duplicate', url.pathname, 'Sitemap ponavlja javnu adresu.')
          paths.add(path)
        }
      }
    }
    report.coverage.sitemapUrls = paths.size
    const songs = [...paths].filter(path => /^\/pesme\/[^/]+\/[^/]+\/[^/]+$/.test(path) && !/\/(?:slovo|info)(?:\/|$)/.test(path))
    const bios = [...paths].filter(path => /^\/biografija\/[^/]+\/[^/]+$/.test(path))
    report.coverage.songUrls = songs.length
    if (!songs.length) add('critical', 'song_sitemap_empty', '/sitemap.xml', 'Sitemap ne sadrži nijednu adresu pesme.')
    const day = now.toISOString().slice(0, 10)
    const selected = [...new Set(['/', '/pesme', '/biografija', '/akordi', '/akordi/C%23', '/public-listening-playlists', '/kontakt', ...samples(songs, Math.min(20, sampleSize), day), ...samples(bios, 2, day)])]
    for (const path of selected) {
      if (robots.status === 200 && !robotsAllows(robots.text, path)) { add('critical', 'robots_blocks_public', path, 'Robots blokira javnu stranicu.'); continue }
      const result = await request(path); report.coverage.pagesChecked++
      if (result.status !== 200) { add('critical', 'page_http', path, 'Javna stranica ne vraća HTTP 200.', {httpStatus:result.status}); continue }
      const $ = load(result.text), canonicals = $('link[rel="canonical"]'), raw = canonicals.attr('href')
      let canonical; try { canonical = new URL(raw).href } catch { /* no canonical */ }
      if (canonicals.length !== 1 || canonical !== new URL(path, origin).href) add('warning', 'canonical', path, 'Canonical nedostaje, ponavlja se ili ne odgovara stranici.', {reason:canonicals.length===0?'missing':canonicals.length>1?'multiple':'mismatch',observedCount:canonicals.length})
      if (!$('title').text().trim()) add('warning', 'title', path, 'Nedostaje naslov stranice.')
      if (!$('meta[name="description"]').attr('content')?.trim()) add('warning', 'description', path, 'Nedostaje opis stranice.')
      if ($('h1').length !== 1) add('warning', 'heading', path, 'Stranica nema tačno jedan glavni naslov.', {observedCount:$('h1').length})
      const robotsMeta = [$('meta[name="robots"]').attr('content'), $('meta[name="googlebot"]').attr('content'), result.headers.get('x-robots-tag')].join(',')
      if (/(?:^|[\s,])(?:noindex|none)(?:[\s,]|$)/i.test(robotsMeta) && !/\/slovo\//.test(path)) add('warning', 'public_noindex', path, 'Javna stranica je označena da se ne indeksira; proveriti da li je to namerno.')
      const types = []
      $('script[type="application/ld+json"]').each((_, node) => { try { types.push(...schemaTypes(JSON.parse($(node).text()))) } catch { add('warning', 'structured_json', path, 'Strukturirani podaci nisu ispravan JSON.') } })
      if (path === '/' && !types.includes('WebSite')) add('warning', 'website_schema', path, 'Početna nema WebSite podatke.')
      if ((songs.includes(path) || bios.includes(path) || path === '/akordi/C%23') && !types.includes('BreadcrumbList')) add('warning', 'breadcrumb_schema', path, 'Nedostaju strukturirani podaci o putanji stranice.')
    }
    for (const path of ['/api/admin/songs', '/api/admin/artists']) {
      const result = await request(path)
      if (![401, 403].includes(result.status)) add('critical', 'admin_access', path, 'Anonimni zahtev ne vraća očekivanu zabranu pristupa.', {httpStatus:result.status})
    }
    if (!checks.length) add('info', 'checks_passed', '/', 'Sve obuhvaćene provere su prošle.')
  } catch { add('critical', 'monitor_incomplete', '/', 'Provera nije završena u dozvoljenom obimu; rezultat nije potvrda ispravnosti sajta.') }
  report.finishedAt = new Date().toISOString()
  report.status = checks.some(check => check.level === 'critical') ? 'critical' : checks.some(check => check.level === 'warning') ? 'warning' : 'healthy'
  // Bound reports even if an entire sitemap is malformed.
  if (checks.length > 200) { report.omittedChecks = checks.length - 200; checks.length = 200 }
  return report
}
const markdownText = value => String(value).replace(/[\\`*_[\]<>|#]/g, character => '\\' + character).replace(/[\r\n]+/g, ' ')
function markdownReport(report) {
  const labels = { healthy: 'Provere su prošle', warning: 'Potrebna je provera nalaza', critical: 'Otkriven je ozbiljan problem' }
  const httpStatus = report.ai.status === 'provider-error' && Number.isInteger(report.ai.httpStatus) && report.ai.httpStatus >= 400 && report.ai.httpStatus <= 599 ? ` (HTTP ${report.ai.httpStatus})` : ''
  const aiNotice = report.ai.status === 'provider-error' && report.ai.httpStatus === 429 ? '\nAI analiza nije dobijena. Proveri API kredite, kvotu i ograničenja zahteva. HTTP 429 sam po sebi ne potvrđuje koji je od tih uzroka. Rezultati redovnih provera ostaju navedeni iznad.\n' : ''
  return `# GitarAkordi — dnevni nadzor\n\n${labels[report.status]}\n\nVreme: ${report.startedAt}\n\nRežim: samo nadzor. Upisi u bazu i kod: **0**.\n\nSitemap: ${report.coverage.sitemapFiles} datoteka, ${report.coverage.sitemapUrls} adresa (${report.coverage.songUrls} pesama). Pregledano stranica: ${report.coverage.pagesChecked}. Ovo je uzorak javnih stranica, bez potvrde Google indeksiranja.\n\n| Nivo | Provera | Putanja | Nalaz |\n| --- | --- | --- | --- |\n${report.checks.map(check => `| ${check.level} | ${check.code} | ${markdownText(check.path)} | ${markdownText(check.message)} |`).join('\n')}\n\nAI: ${markdownText(report.ai.status)}${httpStatus}.\n${aiNotice}${report.ai.analysis ? '\nAI predlog zahteva proveru i odobrenje; ništa nije izvršeno.\n\n' + markdownText(report.ai.analysis.summary) + '\n\n' + report.ai.analysis.findings.map(f => `- ${markdownText(f.checkId)}: ${markdownText(f.explanation)} Predlog: ${markdownText(f.recommendation)}`).join('\n') : ''}\n`
}

module.exports = { originUrl, publicPath, robotsAllows, fetchText, samples, inspectSite, markdownReport, USER_AGENT }
