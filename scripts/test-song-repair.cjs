/* eslint-disable @typescript-eslint/no-require-imports -- Maintenance tests use fake SQL transactions and local generated backups only. */
const { test } = require("node:test")
const assert = require("node:assert/strict")
const { sourceLayoutRepair, createRepairPlanner, contentVersion, validateOperation } = require("./lib/song-repair.cjs")
const { apply } = require("./repair-songs.cjs")
const current = "E       F#m\n              Bm\nsat na ruci, kosulja, cipele, odelo\n\nAm  G\nDrugi probni stih sa dovoljno mesta"
const source = "              Hm       E       F#m\nsat na ruci, kosulja, cipele, odelo\n\nAm                G\nDrugi probni stih sa dovoljno mesta"
const song = (id="a", lyrics=current) => ({id,title:"Probna pesma",slug:"probna-pesma",category:"domace",artistId:"artist",artist:"Test",artistSlug:"test",lyrics,chords:null,popularity:7,difficulty:"beginner",createdAt:"2026-10-01T10:00:00.000Z",review:null})
const candidate = {file:"original.txt",text:source}
test("restores only proven split chord rows from the source, preserving every lyric and other chord positions", () => {
  const result=sourceLayoutRepair(current,source)
  assert.equal(result.restoredBlocks,1)
  assert.equal(result.lyrics,"              Hm       E       F#m\nsat na ruci, kosulja, cipele, odelo\n\nAm  G\nDrugi probni stih sa dovoljno mesta")
  assert.ok(!result.lyrics.includes("Am                G"))
})
test("source restore rejects missing/extra chords, changed lyrics, changed indentation and ambiguous inline notation", () => {
  for(const raw of [source.replace("Hm","Am"),source.replace(" E       F#m"," F#m"),source.replace("cipele","stvari"),source.replace("sat na","  sat na"),source.replace("Am                G","[Am] Probno [G]")]) assert.equal(sourceLayoutRepair(current,raw),null)
  assert.equal(sourceLayoutRepair(current,"[tab]\n"+source),null)
  assert.equal(sourceLayoutRepair(current,source+"\nJos jedan stih"),null)
  assert.equal(sourceLayoutRepair(current,source.replace("kosulja","\uFFFD")),null)
})
test("an unchanged source layout cannot be used to move already aligned chords", () => {
  const repaired=sourceLayoutRepair(current,source).lyrics
  assert.equal(sourceLayoutRepair(repaired,source),null)
})
test("planning preserves existing manual/verified marks and never emits verified", () => {
  const plan=createRepairPlanner()
  for(const status of ["verified","manually_corrected"]){const row=song();row.review={status,reviewedById:"old",updatedAt:"time"};assert.equal(plan(row,[candidate]).state,"protected")}
  const op=plan(song(),[candidate]).operation
  assert.equal(op.status,"manually_corrected");assert.equal(op.rule,"source_layout_restore")
  assert.equal(op.before.lyrics,current);assert.equal(op.before.chords,null)
})
test("different repaired source versions are deferred, not silently chosen", () => {
  assert.equal(createRepairPlanner()(song(),[candidate,{file:"two.txt",text:source.replace("Hm       E","Hm          E")}]).state,"conflicting_sources")
})
test("entities decode as text, not HTML stripping: tabs, annotations and attribution survive", () => {
  const row=song("a","Am\nProbni stih sa &amp; znakom\n&lt; solo &gt;\ne|---&lt;5&gt;---|\nPotpis autora")
  const op=createRepairPlanner()(row).operation
  assert.equal(op.rule,"decode_html_entities")
  assert.equal(op.afterLyrics,"Am\nProbni stih sa & znakom\n< solo >\ne|---<5>---|\nPotpis autora")
})
test("known errors are flagged without invented characters, titles or chord positions", () => {
  for(const row of [song("empty",""),song("encoding","Am\nOstecen \uFFFD znak")]){
    const op=createRepairPlanner()(row).operation;assert.equal(op.rule,"flag_confirmed_error");assert.equal(op.status,"needs_fix");assert.equal(op.afterLyrics,row.lyrics)
  }
  assert.equal(createRepairPlanner()(song("plain","Am\nObican dovoljno dug stih")).operation,null)
})
test("content/status fingerprints detect reviews but ignore independently changing popularity counters", () => {
  const a=song(),b={...a,popularity:99};assert.equal(contentVersion(a),contentVersion(b))
  b.review={status:"manually_corrected"};assert.notEqual(contentVersion(a),contentVersion(b))
})
test("manifest edits cannot bypass re-derivation of content, source evidence or review status", () => {
  const planner=createRepairPlanner(),op=planner(song(),[candidate]).operation
  assert.equal(validateOperation(op,planner).afterLyrics,op.afterLyrics)
  for(const change of [{afterLyrics:"Injected content"},{status:"verified"},{expectedVersion:"old"},{evidence:{...op.evidence,sourceText:"changed"}}]) assert.throws(()=>validateOperation({...op,...change},planner))
})
function fakeDb(rows,options={}){
  let state=structuredClone(rows),snapshot,actor={id:"reviewer"},writes=0,commits=0,rollbacks=0
  const query=async(sql,args=[])=>{
    if(sql.startsWith("BEGIN")){snapshot=structuredClone(state);return{rows:[]}}
    if(sql==="COMMIT"){commits++;return{rows:[]}}
    if(sql==="ROLLBACK"){state=snapshot;rollbacks++;return{rows:[]}}
    if(sql.startsWith("SET LOCAL"))return{rows:[]}
    if(sql.startsWith('SELECT id FROM public."User"'))return{rows:options.noAdmin?[]:[actor]}
    if(sql.includes('FOR UPDATE'))return{rows:[]}
    if(sql.includes('count(*)'))return{rows:[{songs:state.length,favorites:5,links:9}]}
    if(sql.startsWith("SELECT s.*"))return{rows:structuredClone(state.filter(row=>args[0].includes(row.id)).sort((a,b)=>a.id.localeCompare(b.id)))}
    if(sql.startsWith('UPDATE public."Song"')){
      writes++;if(options.failUpdate===writes)throw Object.assign(Error("SQL failed"),{code:"XX001"})
      const row=state.find(row=>row.id===args[1]);if(row.lyrics!==args[2]||row.chords!==args[3])return{rowCount:0}
      row.lyrics=args[0];row.review=null;return{rowCount:1}
    }
    if(sql.startsWith('INSERT INTO public."SongReview"')){const row=state.find(row=>row.id===args[0]);row.review={status:args[1],reviewedById:args[2],updatedAt:"now"};return{rowCount:1}}
    throw Error("Unexpected SQL: "+sql)
  }
  return{query,rows:()=>state,commits:()=>commits,rollbacks:()=>rollbacks,writes:()=>writes}
}
async function manifest(operations){
  const fs=require("node:fs/promises"),os=require("node:os"),path=require("node:path"),dir=await fs.mkdtemp(path.join(os.tmpdir(),"song-repair-test-")),file=path.join(dir,"plan.json")
  await fs.writeFile(file,JSON.stringify({formatVersion:1,operations}))
  return{file,reportRoot:path.join(dir,"reports"),remove:()=>{
    const target=path.resolve(dir)
    if(path.dirname(target)!==path.resolve(os.tmpdir())||!path.basename(target).startsWith("song-repair-test-"))throw Error("Unexpected temporary directory")
    return fs.rm(target,{recursive:true,force:true})
  }}
}
test("apply updates only lyrics and the new status atomically, preserving IDs, null chords and metadata",async()=>{
  const before=song(),op=createRepairPlanner()(before,[candidate]).operation,m=await manifest([op]),db=fakeDb([before])
  try{await apply(db,{manifest:m.file,"reviewer-email":"admin@example.test"},m.reportRoot);assert.equal(db.commits(),1);assert.equal(db.rows()[0].lyrics,op.afterLyrics);assert.equal(db.rows()[0].review.status,"manually_corrected");assert.equal(db.rows()[0].chords,null);assert.equal(db.rows()[0].popularity,7);assert.equal(db.rows()[0].id,before.id)}finally{await m.remove()}
})
test("stale content/status or missing current admin causes no writes",async()=>{
  const row=song(),op=createRepairPlanner()(row,[candidate]).operation,m=await manifest([op])
  try{for(const [rows,options]of [[[{...row,lyrics:row.lyrics+"\nNova izmena"}],{}],[[{...row,review:{status:"manually_corrected"}}],{}],[[row],{noAdmin:true}]]){const db=fakeDb(rows,options);await assert.rejects(apply(db,{manifest:m.file,"reviewer-email":"admin@example.test"},m.reportRoot));assert.equal(db.writes(),0);assert.equal(db.commits(),0)}}finally{await m.remove()}
})
test("failure on a later song rolls back earlier content and status changes",async()=>{
  const rows=[song("a"),song("b")],ops=rows.map(row=>createRepairPlanner()(row,[candidate]).operation),m=await manifest(ops),db=fakeDb(rows,{failUpdate:2})
  try{await assert.rejects(apply(db,{manifest:m.file,"reviewer-email":"admin@example.test"},m.reportRoot));assert.equal(db.commits(),0);assert.equal(db.rollbacks(),1);assert.deepEqual(db.rows(),rows)}finally{await m.remove()}
})
