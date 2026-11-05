/* eslint-disable @typescript-eslint/no-require-imports -- Read-only public-site monitoring CLI. */
const fs = require('node:fs/promises'), path = require('node:path'), { parseArgs } = require('node:util')
const { inspectSite, markdownReport } = require('./lib/site-monitor.cjs')
async function main() {
  const { values } = parseArgs({ options: { 'base-url': { type: 'string', default: process.env.MONITOR_SITE_URL || 'https://moj-sajt-rho.vercel.app' }, out: { type: 'string', default: 'reports/site-monitor' } } })
  const out = path.resolve(values.out), report = await inspectSite({ origin: values['base-url'] })
  await fs.mkdir(out, { recursive: true })
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
  await fs.writeFile(path.join(out, 'summary.md'), markdownReport(report))
  console.log(JSON.stringify({ mode: report.mode, status: report.status, coverage: report.coverage, findings: report.checks.length, report: path.join(out, 'report.json') }))
  if (report.status === 'critical') process.exitCode = 1
}
if (require.main === module) main().catch(() => { console.error('Monitoring could not finish. No content was modified.'); process.exitCode = 1 })
