/* eslint-disable @typescript-eslint/no-require-imports -- Optional, bounded advisory analysis; no action execution. */
const fs = require('node:fs/promises'), path = require('node:path'), { analyzeReport } = require('./lib/site-monitor-ai.cjs'), { markdownReport } = require('./lib/site-monitor.cjs')
async function main() {
  const directory = path.resolve('reports/site-monitor'), file = path.join(directory, 'report.json')
  if ((await fs.stat(file)).size > 512000) throw Error('Report too large')
  const report = await analyzeReport(JSON.parse(await fs.readFile(file, 'utf8')))
  await fs.writeFile(file, JSON.stringify(report, null, 2))
  await fs.writeFile(path.join(directory, 'summary.md'), markdownReport(report))
  console.log(JSON.stringify({ aiStatus: report.ai.status, executionAllowed: false }))
  if (['provider-error', 'incomplete-output', 'invalid-output', 'analysis-unavailable', 'budget-check-unavailable'].includes(report.ai.status)) process.exitCode = 1
}
if (require.main === module) main().catch(() => { console.error('AI report was not completed. No changes were executed.'); process.exitCode = 1 })
