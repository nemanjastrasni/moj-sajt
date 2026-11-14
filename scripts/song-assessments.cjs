/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in, parameterized database maintenance. */
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto'),{parseArgs}=require('node:util')
const ROOT=path.resolve(__dirname,'..'),FILE='lib/music/assessment-version.json'
const INPUTS=['lib/music/difficulty.ts','lib/music/difficultyModel.ts','lib/chords/songSheet.ts','lib/chords/chordSymbols.ts','lib/music/assessment.ts']
async function algorithmHash(root=ROOT){
  const hash=createHash('sha256')
  for(const file of INPUTS)hash.update(file+'\n'+(await fs.readFile(path.join(root,file),'utf8')).replace(/\r\n?/g,'\n')+'\n')
  const lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'))
  hash.update(JSON.stringify(lock.packages['node_modules/chord-symbol']))
  return hash.digest('hex')
}
async function checkVersion(root=ROOT){
  const version=JSON.parse(await fs.readFile(path.join(root,FILE),'utf8'))
  if(version.algorithmHash!==await algorithmHash(root))throw Error('Music parser changed: run node scripts/song-assessments.cjs --refresh-version, then backfill before deployment.')
  return {valid:true,algorithmHash:version.algorithmHash}
}
function music(){require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});return require('../lib/music/assessment.ts')}
async function setup(db){
  await db.query('BEGIN')
  try{await db.query(await fs.readFile(path.join(ROOT,'prisma/song-assessments.sql'),'utf8'));await db.query('COMMIT')}
  catch(error){await db.query('ROLLBACK');throw error}
}
async function backfill(db,{apply=false,backup}={}){
  await checkVersion()
  const {assessSong}=music()
  // Load a consistent source snapshot; parsing does not hold a database connection/lock.
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  let rows
  try{await db.query("SET LOCAL statement_timeout='20s'");rows=(await db.query('SELECT id,lyrics,chords,"musicAssessment" FROM public."Song" ORDER BY id')).rows}
  finally{await db.query('ROLLBACK')}
  const {storedAssessment}=require('../lib/music/storedAssessment.ts')
  const pending=rows.filter(row=>!storedAssessment(row.musicAssessment))
  const prepared=pending.map(row=>({id:row.id,assessment:assessSong(row)}))
  let written=0
  if(apply){
    if(!backup)throw Error('--backup is required for writes')
    const file=path.resolve(backup);await fs.mkdir(path.dirname(file),{recursive:true})
    await fs.writeFile(file,JSON.stringify({format:1,createdAt:new Date().toISOString(),songs:pending.map(row=>({id:row.id,musicAssessment:row.musicAssessment}))})+'\n',{flag:'wx'})
    for(let start=0;start<prepared.length;start+=200){
      const batch=prepared.slice(start,start+200)
      await db.query('BEGIN')
      try{
        await db.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'")
        const result=await db.query(`UPDATE public."Song" s SET "musicAssessment"=r.assessment
          FROM jsonb_to_recordset($1::jsonb) AS r(id text,assessment jsonb)
          WHERE s.id=r.id AND public.song_assessment_hash(s.lyrics,s.chords)=r.assessment->>'sourceHash'
          AND s."musicAssessment" IS DISTINCT FROM r.assessment`,[JSON.stringify(batch)])
        written+=result.rowCount;await db.query('COMMIT')
      }catch(error){await db.query('ROLLBACK');throw error}
    }
  }
  const summary={mode:apply?'apply':'read-only',songs:rows.length,pending:pending.length,written,skippedConcurrentChanges:apply?prepared.length-written:0,algorithmHash:(await checkVersion()).algorithmHash}
  return summary
}
async function main(){
  const {values}=parseArgs({options:{check:{type:'boolean'},'refresh-version':{type:'boolean'},apply:{type:'boolean'},backup:{type:'string'},ca:{type:'string'}}})
  if(values['refresh-version']){await fs.writeFile(path.join(ROOT,FILE),JSON.stringify({algorithmHash:await algorithmHash()})+'\n');console.log(JSON.stringify(await checkVersion()));return}
  if(values.check){console.log(JSON.stringify(await checkVersion()));return}
  if(values.apply&&!values.backup)throw Error('--backup is required before schema/backfill writes')
  require('@next/env').loadEnvConfig(ROOT,false,{info(){},error(){}})
  const db=await require('./lib/artist-image-source.cjs').databaseClient(values.ca)
  try{if(values.apply)await setup(db);console.log(JSON.stringify(await backfill(db,{apply:values.apply,backup:values.backup})))}finally{await db.end()}
}
module.exports={algorithmHash,checkVersion,setup,backfill,INPUTS}
if(require.main===module)main().catch(error=>{console.error('Song assessments stopped:',error.code||error.message);process.exitCode=1})
