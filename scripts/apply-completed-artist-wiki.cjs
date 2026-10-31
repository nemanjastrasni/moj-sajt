/* eslint-disable @typescript-eslint/no-require-imports -- Explicit, backed-up maintenance publication. */
const fs=require('node:fs/promises'),path=require('node:path'),{parseArgs}=require('node:util')
const {databaseClient}=require('./lib/artist-image-source.cjs')
const {deploymentOrigin,deploymentBytes}=require('./artist-image-publish.cjs')
const {hash,credit,validSource,eligibleDiscography,saveProfile}=require('./lib/artist-wiki-store.cjs')
const ROOT=path.resolve(__dirname,'..')
function validatePlan(report){
  if(report.source!=='live-database'||!Array.isArray(report.artists))throw Error('LIVE_PLAN_REQUIRED')
  const ids=new Set()
  for(const artist of report.artists){
    if(!artist.id||ids.has(artist.id))throw Error('INVALID_ARTIST_ID');ids.add(artist.id)
    for(const [field,change] of Object.entries(artist.changes||{})){
      if(!['bio','discography'].includes(field)||!/^Q\d+$/.test(artist.proposal?.wikidataId||''))throw Error('INVALID_PLAN_CHANGE')
      if(!validSource(artist.proposal[field==='bio'?'bioSource':'discographySource']))throw Error('PINNED_SOURCE_REQUIRED')
      if(hash(change.after)!==hash(artist.proposal[field]))throw Error('PROPOSAL_CONTENT_MISMATCH')
      if(field==='bio'&&(typeof change.after!=='string'||change.after.length<200||change.after.length>20000))throw Error('INVALID_BIOGRAPHY')
      if(field==='discography'&&!eligibleDiscography(change.after))throw Error('INVALID_ALBUM_LIST')
    }
  }
}
async function verifyPublished(baseUrl){
  const html=(await deploymentBytes(deploymentOrigin(baseUrl)+'/wiki-izvori')).toString('utf8')
  if(!html.includes('data-artist-wiki-storage="database"'))throw Error('DEPLOY_DATABASE_CREDITS_FIRST')
}
async function applyReport(report,ca,baseUrl,{verify=verifyPublished,connect=databaseClient,directory=path.join(ROOT,'reports/artist-wiki','completion-apply-'+new Date().toISOString().replace(/[:.]/g,'-'))}={}){
  validatePlan(report);await verify(baseUrl)
  const eligible=report.artists.filter(a=>Object.keys(a.changes||{}).length),result={updated:[],skipped:[]}
  await fs.mkdir(directory,{recursive:true})
  const db=await connect(ca)
  try{
    const before=(await db.query('SELECT id,name,slug,category,bio,"bioShort",discography,image,members FROM public."Artist" ORDER BY id')).rows
    await fs.writeFile(path.join(directory,'before.json'),JSON.stringify({createdAt:new Date().toISOString(),artists:before},null,2),{flag:'wx'})
    for(let start=0;start<eligible.length;start+=40){
      const updated=[],skipped=[],batch=eligible.slice(start,start+40)
      await db.query('BEGIN')
      try{
        await db.query("SET LOCAL lock_timeout='5s'")
        const live=(await db.query('SELECT id,name,slug,category,bio,discography FROM public."Artist" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[batch.map(a=>a.id)])).rows
        for(const artist of batch){
          const current=live.find(a=>a.id===artist.id),sources={}
          if(!current||['name','slug','category'].some(field=>current[field]!==artist[field])){skipped.push({id:artist.id,reason:'Identity changed'});continue}
          for(const [field,change] of Object.entries(artist.changes)){
            if(hash(current[field])!==hash(change.before)){skipped.push({id:artist.id,field,reason:'Content changed since plan'});continue}
            await db.query(`UPDATE public."Artist" SET "${field}"=$1${field==='discography'?'::jsonb':''} WHERE id=$2`,[field==='discography'?JSON.stringify(change.after):change.after,artist.id])
            sources[field]=credit(change.after,artist.proposal[field==='bio'?'bioSource':'discographySource'])
            updated.push({id:artist.id,name:artist.name,field})
          }
          if(Object.keys(sources).length)await saveProfile(db,current,artist.proposal,sources)
        }
        await fs.writeFile(path.join(directory,`batch-${start}-intent.json`),JSON.stringify({updated,skipped,state:'not-yet-committed'},null,2))
        await db.query('COMMIT');result.updated.push(...updated);result.skipped.push(...skipped)
        await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(result,null,2))
        console.log(JSON.stringify({processed:Math.min(start+40,eligible.length),total:eligible.length,updatedFields:result.updated.length,skipped:result.skipped.length}))
      }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
    }
  }finally{await db.end()}
  return result
}
async function main(){
  const {values}=parseArgs({options:{ca:{type:'string'},report:{type:'string',default:'reports/artist-wiki/completion-2026-10-31/refined-report.json'},'base-url':{type:'string'},apply:{type:'boolean',default:false}}})
  require('@next/env').loadEnvConfig(ROOT)
  const report=JSON.parse(await fs.readFile(path.resolve(ROOT,values.report),'utf8'));validatePlan(report)
  if(!values.apply){console.log(JSON.stringify({dryRun:true,...report.summary}));return}
  const result=await applyReport(report,values.ca,values['base-url'])
  console.log(JSON.stringify({biographies:result.updated.filter(a=>a.field==='bio').length,discographies:result.updated.filter(a=>a.field==='discography').length,skipped:result.skipped.length}))
}
if(require.main===module)main().catch(e=>{console.error(e.message?.match(/^[A-Z_]+$/)?e.message:e.code||e.name);process.exitCode=1})
module.exports={validatePlan,verifyPublished,applyReport}
