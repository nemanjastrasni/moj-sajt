/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in additive maintenance. */
const fs=require('node:fs/promises'),path=require('node:path'),{parseArgs}=require('node:util')
const {loadEnvConfig}=require('@next/env'),{databaseClient}=require('./lib/artist-image-source.cjs')
const {snapshot,dataState,verify,quote}=require('./harden-database-access.cjs')
const ROOT=path.resolve(__dirname,'..')
async function inspect(db){
  const columns=(await db.query(`SELECT column_name,udt_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='SongSubmission' ORDER BY ordinal_position`)).rows
  if(!columns.length)return {exists:false}
  const constraints=(await db.query(`SELECT con.conname,pg_get_constraintdef(con.oid) AS definition,con.confdeltype,target.relname AS target_table,n.nspname AS target_schema FROM pg_constraint con LEFT JOIN pg_class target ON target.oid=con.confrelid LEFT JOIN pg_namespace n ON n.oid=target.relnamespace WHERE con.conrelid='public."SongSubmission"'::regclass ORDER BY con.conname`)).rows
  const indexes=(await db.query(`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='SongSubmission' ORDER BY indexname`)).rows
  const count=Number((await db.query('SELECT count(*) AS count FROM public."SongSubmission"')).rows[0].count)
  return {exists:true,columns,constraints,indexes,count}
}
function validate(state){
  if(!state.exists)throw Error('Submission table missing')
  const expected={id:'text',userId:'text',category:'text',artistName:'text',title:'text',lyrics:'text',status:'text',reviewNote:'text',reviewerId:'text',publishedSongId:'text',createdAt:'timestamp',reviewedAt:'timestamp'}
  const nullable=new Set(['reviewNote','reviewerId','publishedSongId','reviewedAt'])
  if(state.columns.length!==12||state.columns.some(c=>expected[c.column_name]!==c.udt_name||(c.is_nullable==='YES')!==nullable.has(c.column_name)))throw Error('Unexpected submission schema; preserved')
  for(const suffix of ['pkey','userId_fkey','publishedSongId_fkey','status_check','category_check'])if(!state.constraints.some(c=>c.conname==='SongSubmission_'+suffix))throw Error('Incomplete constraints')
  for(const [name,target,action] of [['userId','User','c'],['publishedSongId','Song','n']]){
    const fk=state.constraints.find(c=>c.conname===`SongSubmission_${name}_fkey`)
    if(fk.target_schema!=='public'||fk.target_table!==target||fk.confdeltype!==action)throw Error('Unexpected foreign key')
  }
  for(const name of ['SongSubmission_userId_createdAt_idx','SongSubmission_status_createdAt_idx'])if(!state.indexes.some(i=>i.indexname===name))throw Error('Missing submission index')
}
async function main(){
  const {values}=parseArgs({options:{ca:{type:'string'},apply:{type:'boolean',default:false}}})
  loadEnvConfig(ROOT)
  const db=await databaseClient(values.ca)
  let committed=false
  try{
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ')
    await db.query("SET LOCAL lock_timeout='5s'")
    const before=await inspect(db),security=await snapshot(db)
    if(before.exists){validate(before);await verify(db)}
    if(!values.apply){console.log(JSON.stringify({apply:false,exists:before.exists}));await db.query('ROLLBACK');return}
    await db.query(`LOCK TABLE ${security.objects.filter(o=>o.relkind!=='S').map(o=>'public.'+quote(o.relname)).join(',')} IN SHARE MODE`)
    const rowsBefore=await dataState(db,security.objects)
    const backup=path.join(ROOT,'reports/database-access','submissions-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json')
    await fs.mkdir(path.dirname(backup),{recursive:true})
    await fs.writeFile(backup,JSON.stringify({before,security,rowsBefore,containsUserContent:false},null,2),{flag:'wx'})
    const source=await fs.readFile(path.join(ROOT,'prisma/sql/song-submissions.sql'),'utf8')
    await db.query(source.split(/\r?\n/).filter(line=>line!=='BEGIN;'&&line!=='COMMIT;').join('\n'))
    const after=await inspect(db);validate(after);await verify(db)
    if(!before.exists&&after.count!==0||JSON.stringify(rowsBefore)!==JSON.stringify(await dataState(db,security.objects)))throw Error('Unexpected content change; rollback')
    await db.query('COMMIT');committed=true
    console.log(JSON.stringify({applied:true,created:!before.exists,count:after.count,existingRowsUnchanged:true,backup}))
  }catch(error){if(!committed)await db.query('ROLLBACK').catch(()=>{});throw error}finally{await db.end()}
  const fresh=await databaseClient(values.ca)
  try{const state=await inspect(fresh);validate(state);await verify(fresh);console.log(JSON.stringify({independentlyVerified:true,submissionRows:state.count}))}finally{await fresh.end()}
}
if(require.main===module)main().catch(error=>{console.error('Submission setup stopped:',error.code||error.message);process.exitCode=1})
module.exports={validate}
