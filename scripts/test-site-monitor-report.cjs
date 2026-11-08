/* eslint-disable @typescript-eslint/no-require-imports -- Offline tests for public diagnostic transport. */
const {test}=require('node:test'),assert=require('node:assert/strict')
const {createPublishedReport,parsePublishedReport,reportAnnotation,ANNOTATION_TITLE}=require('./lib/site-monitor-report.cjs')
const fixture=()=>({formatVersion:1,mode:'observe-only',origin:'https://site.example',startedAt:'2026-11-08T04:23:00Z',finishedAt:'2026-11-08T04:24:00Z',status:'warning',coverage:{sitemapFiles:13,sitemapUrls:10000,songUrls:9000,pagesChecked:21,requests:38,responseBytes:100000},checks:[{id:'check-1',level:'warning',code:'canonical',path:'/pesme/domace/bend/pesma',message:'private-body-never-publish'}],ai:{status:'not-requested'},databaseWrites:0,sourceWrites:0,lyrics:'secret-song',databaseUrl:'secret-credential'})
const context={runId:'42',attempt:1}
test('published diagnostics whitelist public facts and omit raw messages, songs and credentials',()=>{
 const clean=createPublishedReport(fixture(),context)
 assert.equal(clean.runId,'42');assert.equal(clean.checks[0].code,'canonical')
 assert.doesNotMatch(JSON.stringify(clean),/private-body|secret-|databaseUrl|lyrics|message/)
 assert.equal(parsePublishedReport(clean,{id:42,attempt:1}).status,'warning')
 assert.equal(parsePublishedReport(clean,{id:43,attempt:1}),null)
 assert.equal(parsePublishedReport(clean,{id:42,attempt:2}),null)
})
test('unsafe, incomplete and inconsistent reports cannot be presented as verified results',()=>{
 for(const override of [{databaseWrites:1},{sourceWrites:1},{origin:'https://user:secret@site.example'},{status:'healthy'},{finishedAt:'bad'},{checks:[{id:'check-1',level:'warning',code:'canonical',path:'/profile/private'}]}])assert.throws(()=>createPublishedReport({...fixture(),...override},context),/INVALID_MONITOR/)
 assert.throws(()=>createPublishedReport(fixture(),{runId:'not-numeric',attempt:1}))
})
test('a bounded preview keeps critical findings first and declares omitted findings',()=>{
 const report=fixture();report.status='critical';report.checks=Array.from({length:70},(_,i)=>({id:'check-'+(i+1),level:i===69?'critical':'warning',code:'canonical',path:'/pesme/domace/bend/pesma'}))
 const clean=createPublishedReport(report,context)
 assert.equal(clean.checks.length,40);assert.equal(clean.omittedChecks,30);assert.equal(clean.checks[0].level,'critical')
})
test('the notice is one escaped workflow command and extra fields never enter its payload',()=>{
 const report=fixture();report.ai={status:'advice-ready',analysis:{summary:'Provera 100%0A::error:: primer',findings:[{checkId:'check-1',explanation:'Proveriti oznaku.',recommendation:'Potreban pregled.\n::error::nije komanda',requiresApproval:true}]}}
 const clean=createPublishedReport(report,context),line=reportAnnotation({...clean,secret:'never-publish'})
 assert.ok(line.startsWith('::notice file=.github/workflows/site-monitor.yml,line=1,title='+ANNOTATION_TITLE+'::'))
 assert.equal(line.includes('\n'),false);assert.ok(line.includes('100%250A'));assert.doesNotMatch(line,/never-publish/)
})
