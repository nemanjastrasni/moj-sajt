/* eslint-disable @typescript-eslint/no-require-imports -- Shared, dependency-light public report contract. */
const { publicPath, originUrl } = require('./site-monitor.cjs')
const { validAnalysis } = require('./site-monitor-ai.cjs')
const ANNOTATION_TITLE = 'GitarAkordi monitor report v1'
const MAX_REPORT_BYTES = 32000
const CODES = new Set(['robots_http','robots_sitemap','sitemap_http','sitemap_index','sitemap_origin','sitemap_partition_http','empty_sitemap','oversized_sitemap','sitemap_private_or_foreign','sitemap_duplicate','song_sitemap_empty','robots_blocks_public','page_http','canonical','title','description','heading','home_navigation','public_noindex','structured_json','website_schema','breadcrumb_schema','admin_access','checks_passed','monitor_incomplete'])
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max
function reportPath(value, origin) {
  if (typeof value !== 'string' || value.length > 250 || !value.startsWith('/') || value.startsWith('//')) return null
  if (/^\/(?:robots\.txt|sitemap\.xml|sitemaps\/(?:pages|songs-\d+|artists-\d+)\.xml|api\/admin\/(?:songs|artists))$/.test(value)) return value
  return publicPath(origin + value, origin) === value ? value : null
}
function parsePublishedReport(value, expectedRun) {
  try {
    if (!value || value.schemaVersion !== 1 || value.databaseWrites !== 0 || value.sourceWrites !== 0 || !/^\d{1,18}$/.test(value.runId) || !integer(value.attempt,1000) || value.attempt < 1) return null
    if (expectedRun && (value.runId !== String(expectedRun.id) || value.attempt !== expectedRun.attempt)) return null
    const origin = originUrl(value.origin)
    if (typeof value.startedAt !== 'string' || typeof value.finishedAt !== 'string' || !Number.isFinite(Date.parse(value.startedAt)) || !Number.isFinite(Date.parse(value.finishedAt)) || Date.parse(value.finishedAt) < Date.parse(value.startedAt)) return null
    if (!['healthy','warning','critical'].includes(value.status) || !Array.isArray(value.checks) || value.checks.length < 1 || value.checks.length > 40 || !integer(value.omittedChecks,10000000)) return null
    const coverage = {}
    for (const [key,max] of Object.entries({sitemapFiles:100,sitemapUrls:5000000,songUrls:5000000,pagesChecked:100,requests:100,responseBytes:33554432})) {
      if (!integer(value.coverage?.[key],max)) return null
      coverage[key]=value.coverage[key]
    }
    if (value.status!=='critical' && (coverage.pagesChecked<7 || coverage.sitemapFiles<1 || coverage.songUrls<1 || coverage.sitemapUrls<1)) return null
    const ids = new Set(), checks = []
    for (const row of value.checks) {
      if (!row || typeof row.id !== 'string' || !/^check-\d{1,6}$/.test(row.id) || ids.has(row.id) || !CODES.has(row.code) || !['info','warning','critical'].includes(row.level) || !reportPath(row.path,origin)) return null
      ids.add(row.id)
      const check={id:row.id,level:row.level,code:row.code,path:row.path}
      if (integer(row.httpStatus,599)) check.httpStatus=row.httpStatus
      if (['canonical','heading'].includes(row.code) && integer(row.observedCount,1000)) check.observedCount=row.observedCount
      if (row.code==='canonical' && ['missing','multiple','mismatch'].includes(row.reason)) check.reason=row.reason
      checks.push(check)
    }
    if (value.status === 'healthy' && (value.omittedChecks || checks.some(row=>row.level!=='info')) || value.status === 'warning' && checks.some(row=>row.level==='critical')) return null
    if (value.status==='critical' && !checks.some(row=>row.level==='critical') || value.status==='warning' && !checks.some(row=>row.level==='warning')) return null
    if (!value.ai || typeof value.ai.status !== 'string' || !/^[a-z-]{1,45}$/.test(value.ai.status)) return null
    const ai = {status:value.ai.status}
    if (integer(value.ai.httpStatus,599) && value.ai.httpStatus>=400) ai.httpStatus=value.ai.httpStatus
    if (value.ai.status === 'advice-ready' && validAnalysis(value.ai.analysis,[...ids])) ai.analysis=value.ai.analysis
    const clean = {schemaVersion:1,runId:value.runId,attempt:value.attempt,origin,startedAt:value.startedAt,finishedAt:value.finishedAt,status:value.status,coverage,checks,omittedChecks:value.omittedChecks,ai,databaseWrites:0,sourceWrites:0}
    return Buffer.byteLength(JSON.stringify(clean))<=MAX_REPORT_BYTES ? clean : null
  } catch {return null}
}
function createPublishedReport(report, context) {
  if (report?.formatVersion !== 1 || report.mode !== 'observe-only' || !Array.isArray(report.checks) || report.databaseWrites !== 0 || report.sourceWrites !== 0) throw Error('INVALID_MONITOR_REPORT')
  const rank={critical:0,warning:1,info:2}, checks=[...report.checks].sort((a,b)=>rank[a.level]-rank[b.level]).slice(0,40)
  const clean=parsePublishedReport({schemaVersion:1,runId:String(context.runId),attempt:Number(context.attempt),origin:report.origin,startedAt:report.startedAt,finishedAt:report.finishedAt,status:report.status,coverage:report.coverage,checks,omittedChecks:(report.omittedChecks||0)+report.checks.length-checks.length,ai:report.ai,databaseWrites:report.databaseWrites,sourceWrites:report.sourceWrites})
  if (!clean) throw Error('INVALID_MONITOR_REPORT')
  return clean
}
function reportAnnotation(report) {
  const clean=parsePublishedReport(report)
  if (!clean) throw Error('INVALID_MONITOR_REPORT')
  const json=JSON.stringify(clean)
  return `::notice file=.github/workflows/site-monitor.yml,line=1,title=${ANNOTATION_TITLE}::${json.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A')}`
}
module.exports={ANNOTATION_TITLE,MAX_REPORT_BYTES,createPublishedReport,parsePublishedReport,reportAnnotation,reportPath}
