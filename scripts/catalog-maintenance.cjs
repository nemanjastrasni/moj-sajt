/* eslint-disable @typescript-eslint/no-require-imports -- Explicitly invoked database maintenance CLI. */
const fs=require('node:fs/promises'),path=require('node:path')
const {parseArgs}=require('node:util')
const {scope,hash,rowKey,corePlan,dedupePlan,assertCurrent,verifyRedirects,requireThat}=require('./lib/catalog-maintenance.cjs')
const ROOT=path.resolve(__dirname,'..'),REPORTS=path.join(ROOT,'reports/song-repairs')
const quote=value=>'"'+value.replaceAll('"','""')+'"'
async function durable(file,value) {
  const handle=await fs.open(file,'wx')
  try {await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync()}finally{await handle.close()}
}
async function references(db,target,ids) {
  const keys=(await db.query(`SELECT n.nspname AS schema,t.relname AS table,array_agg(a.attname::text ORDER BY k.ordinality) AS columns
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ordinality)
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum
    WHERE c.contype='f' AND c.confrelid=$1::regclass GROUP BY c.conname,n.nspname,t.relname ORDER BY n.nspname,t.relname,c.conname`,[target])).rows
  const result=[]
  for(const key of keys) {
    requireThat(key.schema==='public'&&key.columns.length===1,'Unreviewed foreign-key shape')
    const column=key.columns[0]
    const rows=(await db.query('SELECT * FROM '+quote(key.schema)+'.'+quote(key.table)+' t WHERE '+quote(column)+'=ANY($1::text[]) ORDER BY to_jsonb(t)::text',[ids])).rows
    result.push({table:key.table,column,rows})
  }
  return result
}
async function snapshot(db) {
  const artists=(await db.query('SELECT * FROM public."Artist" ORDER BY id')).rows
  const songs=(await db.query('SELECT * FROM public."Song" ORDER BY id')).rows
  const songReferences=await references(db,'public."Song"',[scope.emptySong,...scope.pairs.flatMap(pair=>[pair.keep.id,pair.remove.id])])
  const artistReferences=await references(db,'public."Artist"',[scope.retainArtist.id,scope.removeArtist.id])
  return {artists,songs,songReferences,artistReferences}
}
function changes(plan){return plan.phase==='core'?corePlan:dedupePlan}
function assertOnlyExpected(before,after,operations) {
  for(const [table,key]of [['Artist','artists'],['Song','songs']]) {
    const expected=new Map(before[key].map(row=>[row.id,row]))
    for(const op of operations.filter(op=>op.table===table)) {if(op.after)expected.set(op.id,op.after);else expected.delete(op.id)}
    const actual=new Map(after[key].map(row=>[row.id,row]))
    for(const id of new Set([...expected.keys(),...actual.keys()])) {
      if(hash(expected.get(id)??null)!==hash(actual.get(id)??null)) {
        const fields=[...new Set([...Object.keys(expected.get(id)??{}),...Object.keys(actual.get(id)??{})])].filter(field=>hash(expected.get(id)?.[field]??null)!==hash(actual.get(id)?.[field]??null))
        throw Error('Unexpected catalog changes: '+table+' '+id+' fields '+fields.join(','))
      }
    }
  }
  assertCurrent(operations,after,true)
}
async function mutate(db,operations,rollback=false) {
  const list=rollback?[...operations].reverse():operations
  for(const op of list) {
    requireThat(['Artist','Song','SongReview'].includes(op.table)&&op.key===rowKey(op.table),'Unsupported maintenance table')
    const before=rollback?op.after:op.before,after=rollback?op.before:op.after,table='public.'+quote(op.table)
    let result
    if(after===null) result=await db.query('DELETE FROM '+table+' WHERE '+quote(op.key)+'=$1',[op.id])
    else if(before===null) result=await db.query('INSERT INTO '+table+' SELECT * FROM jsonb_populate_record(NULL::'+table+',$1::jsonb)',[JSON.stringify(after)])
    else {
      const keys=Object.keys(after).filter(key=>hash(before[key])!==hash(after[key]))
      requireThat(keys.length===1&&['category','name'].includes(keys[0]),'Unsupported maintenance field')
      result=await db.query('UPDATE '+table+' SET '+quote(keys[0])+'=$1 WHERE '+quote(op.key)+'=$2',[after[keys[0]],op.id])
    }
    requireThat(result.rowCount===1,'Unexpected affected-row count')
  }
}
async function lock(db) {
  await db.query("SET LOCAL lock_timeout='5s'")
  await db.query("SELECT pg_advisory_xact_lock(hashtext('gitarakordi-reviewed-catalog-2026-11-07'))")
  const artists=[...scope.missingArtists.map(row=>row.id),scope.rename.id,scope.retainArtist.id,scope.removeArtist.id]
  const songs=[scope.emptySong,...scope.categorySongs.map(row=>row.id),...scope.pairs.flatMap(pair=>[pair.keep.id,pair.remove.id])]
  await db.query('SELECT id FROM public."Artist" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[artists])
  await db.query('SELECT id FROM public."Song" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[songs])
  await db.query('SELECT "songId" FROM public."SongReview" WHERE "songId"=ANY($1::text[]) ORDER BY "songId" FOR UPDATE',[songs])
}
async function main() {
  const {values}=parseArgs({options:{mode:{type:'string',default:'plan'},phase:{type:'string',default:'core'},manifest:{type:'string'},ca:{type:'string'},origin:{type:'string'}}})
  requireThat(['plan','check','apply','rollback'].includes(values.mode),'Mode must be plan/check/apply/rollback')
  requireThat(['core','dedupe'].includes(values.phase),'Phase must be core/dedupe')
  require('@next/env').loadEnvConfig(ROOT)
  // Preserve the database's timestamp text (including sub-millisecond precision).
  // Converting timestamp-without-time-zone to JS Date shifts a restored row in other time zones.
  const {types}=require('pg')
  types.setTypeParser(1114,value=>value)
  types.setTypeParser(1184,value=>value)
  let plan,redirectCheck
  if(values.mode!=='plan') {
    requireThat(values.manifest,'A local manifest is required')
    const file=path.resolve(values.manifest),relative=path.relative(REPORTS,file)
    requireThat(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Manifest must be inside ignored reports/song-repairs')
    plan=JSON.parse(await fs.readFile(file,'utf8'))
    requireThat(plan.version===1&&plan.timestampFormat==='postgres-text'&&plan.scopeHash===hash(scope)&&['core','dedupe'].includes(plan.phase)&&Array.isArray(plan.operations),'Unexpected reviewed plan/timestamp format')
    if(values.mode==='rollback') {
      const result=JSON.parse(await fs.readFile(path.join(path.dirname(file),'result.json'),'utf8'))
      requireThat(result.committed===true&&result.mode==='apply'&&result.phase===plan.phase&&result.operations===plan.operations.length,'Rollback requires a committed application journal')
    }
    if(plan.phase==='dedupe'&&values.mode==='apply')redirectCheck=await verifyRedirects(values.origin||process.env.SITE_URL||'https://moj-sajt-rho.vercel.app')
  }
  const out=path.join(REPORTS,'catalog-'+values.mode+'-'+new Date().toISOString().replace(/[:.]/g,'-'))
  await fs.mkdir(out,{recursive:true})
  const db=await require('./lib/artist-image-source.cjs').databaseClient(values.ca)
  let committed=false,commitAttempted=false
  try {
    await db.query(values.mode==='plan'?'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY':'BEGIN ISOLATION LEVEL SERIALIZABLE')
    if(values.mode!=='plan')await lock(db)
    const before=await snapshot(db)
    if(values.mode==='plan') {
      const phase=values.phase,operations=(phase==='core'?corePlan:dedupePlan)(before)
      plan={version:1,timestampFormat:'postgres-text',scopeHash:hash(scope),createdAt:new Date().toISOString(),approval:scope.approval,phase,operations}
      // A bound manifest must not silently lose a prepared photo or source after a category/name repair.
      for(const file of ['public/artist-photos/manifest.json','public/artist-wiki/manifest.json']) {
        const manifest=JSON.parse(await fs.readFile(path.join(ROOT,file),'utf8'))
        requireThat(!(manifest.photos||manifest.artists).some(row=>operations.some(op=>op.table==='Artist'&&op.after&&op.id===row.artistId)),'A photo/wiki manifest must be updated before this repair')
      }
      await durable(path.join(out,'plan.json'),plan)
      await db.query('ROLLBACK')
      console.log(JSON.stringify({mode:'plan',phase,operations:operations.length,databaseWrites:0,manifest:path.join(out,'plan.json')}))
      return
    }
    if(values.mode==='rollback') {
      requireThat(plan.applied===true,'Rollback requires the applied before.json journal')
      assertCurrent(plan.operations,before,true)
      // Never remove newly added references while rolling back a category/name repair.
      await durable(path.join(out,'before.json'),{...plan,rollbackOf:values.manifest,applied:false})
      await mutate(db,plan.operations,true)
      const after=await snapshot(db)
      assertCurrent(plan.operations,after,false)
    } else {
      requireThat(hash(changes(plan)(before))===hash(plan.operations),'Plan is stale; regenerate it')
      assertCurrent(plan.operations,before)
      await durable(path.join(out,'before.json'),{...plan,manifest:values.manifest,redirectCheck,applied:values.mode==='apply'})
      await durable(path.join(out,'intent.json'),{mode:values.mode,phase:plan.phase,planHash:hash(plan),approval:scope.approval,at:new Date().toISOString()})
      await mutate(db,plan.operations)
      const after=await snapshot(db)
      assertOnlyExpected(before,after,plan.operations)
      if(values.mode==='check') {
        await mutate(db,plan.operations,true)
        const restored=await snapshot(db)
        assertOnlyExpected(before,restored,[])
        assertCurrent(plan.operations,restored)
      }
    }
    if(values.mode==='check')await db.query('ROLLBACK')
    else {commitAttempted=true;await db.query('COMMIT');committed=true}
    const result={mode:values.mode,phase:plan.phase,committed,operations:plan.operations.length,...(values.mode==='check'?{rollbackVerified:true}:{}),redirectCheck,at:new Date().toISOString(),backup:path.join(out,'before.json')}
    await durable(path.join(out,'result.json'),result)
    console.log(JSON.stringify(result))
  } catch(error) {
    try{await db.query('ROLLBACK')}catch{}
    await durable(path.join(out,'failure.json'),{committed,commitAttempted,error:error.code||error.message,at:new Date().toISOString()}).catch(()=>{})
    throw error
  } finally {await db.end()}
}
if(require.main===module)main().catch(error=>{console.error(error.code||error.message);process.exitCode=1})
module.exports={snapshot,mutate,assertOnlyExpected,lock}
