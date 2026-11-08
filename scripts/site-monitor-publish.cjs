/* eslint-disable @typescript-eslint/no-require-imports -- Publish only a validated diagnostic annotation, with no API token or database. */
const fs=require('node:fs/promises')
const {createPublishedReport,reportAnnotation}=require('./lib/site-monitor-report.cjs')
async function main() {
  if (process.env.GITHUB_ACTIONS!=='true' || process.env.GITHUB_REF!=='refs/heads/main' || !['schedule','push','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) throw Error('TRUSTED_MONITOR_RUN_REQUIRED')
  const file='reports/site-monitor/report.json'
  if ((await fs.stat(file)).size>400000) throw Error('MONITOR_REPORT_TOO_LARGE')
  const report=JSON.parse(await fs.readFile(file,'utf8'))
  console.log(reportAnnotation(createPublishedReport(report,{runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT})))
}
if(require.main===module)main().catch(error=>{console.error(['TRUSTED_MONITOR_RUN_REQUIRED','MONITOR_REPORT_TOO_LARGE','INVALID_MONITOR_REPORT'].includes(error.message)?error.message:'Public monitor details were not published. Inspect the retained report.');process.exitCode=1})
