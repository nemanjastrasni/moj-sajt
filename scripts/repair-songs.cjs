/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in database maintenance CLI. */
const fs = require("node:fs/promises"), { existsSync } = require("node:fs"), path = require("node:path")
const { parseArgs } = require("node:util")
const { loadEnvConfig } = require("@next/env")
const { databaseClient } = require("./lib/artist-image-source.cjs")
const { sourceIndex } = require("./audit-songs.cjs")
const { songKey, hash, escapeHtml: h } = require("./lib/song-audit.cjs")
const { PROTECTED, contentVersion, createRepairPlanner, validateOperation } = require("./lib/song-repair.cjs")
const ROOT = path.resolve(__dirname, "..")
const planner = () => createRepairPlanner(url => existsSync(path.join(ROOT, "public", decodeURIComponent(url))))
const songSelect = 'SELECT s.*, a.name AS artist, a.slug AS "artistSlug", CASE WHEN r."songId" IS NULL THEN NULL ELSE jsonb_build_object(\'status\',r.status,\'reviewedById\',r."reviewedById",\'updatedAt\',r."updatedAt") END AS review FROM public."Song" s JOIN public."Artist" a ON a.id=s."artistId" LEFT JOIN public."SongReview" r ON r."songId"=s.id'
function report(plan) {
  return `<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Predlog ispravki</title><style>body{font:15px/1.5 system-ui;margin:0;background:#f5f6f8;color:#20252c}main{max-width:1400px;margin:auto;padding:24px}section{padding:24px 0;border-top:1px solid #ccd2d8}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}pre{overflow:auto;background:white;padding:16px;font:14px/1.6 monospace;tab-size:8}h1{font-size:26px}h2{font-size:20px}a{color:#075ba6}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style><main><h1>Predlog ispravki: ${plan.operations.length}</h1><p>Samo predlog. Nista nije upisano u bazu. Muzicka tacnost nije automatski potvrdjena. Postojece rucne oznake se cuvaju.</p>${plan.operations.map(op => `<section><h2><a href="https://moj-sajt-rho.vercel.app${h(op.href)}">${h(op.artist)} - ${h(op.title || "(bez naziva)")}</a></h2><p>${h(op.rule)}; nova oznaka: ${h(op.status)}${op.evidence ? `; vraceno izvornih redova: ${op.evidence.restoredBlocks}` : ""}</p><p>Preostalo za pregled: ${h(op.afterIssues.map(issue => issue.code).join(", ") || "nema tehnickih upozorenja")}</p><div class="pair"><div><h3>Pre</h3><pre>${h(op.before.lyrics)}</pre></div><div><h3>Posle</h3><pre>${h(op.afterLyrics)}</pre></div></div></section>`).join("")}</main></html>`
}

async function prepare(db, values) {
  const limit = Number(values.limit ?? 30)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw Error("Limit must be 1-100")
  const sources = await sourceIndex(values.sources ?? [])
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
  let songs
  try { songs = (await db.query(songSelect + ' ORDER BY s.id')).rows; await db.query("COMMIT") }
  catch (error) { await db.query("ROLLBACK"); throw error }
  const planSong = planner(), counts = {}, candidates = [], cache = new Map()
  for (const song of songs) {
    const inputs = []
    for (const source of sources.index.get(songKey(song.artist, song.title)) ?? []) {
      if (!cache.has(source.file)) cache.set(source.file, await fs.readFile(source.file, "utf8"))
      inputs.push({ file: source.file, text: cache.get(source.file) })
    }
    const result = planSong(song, inputs)
    counts[result.state] = (counts[result.state] ?? 0) + 1
    if (result.operation) candidates.push(result.operation)
  }
  const layout = candidates.filter(row => row.rule === "source_layout_restore" && row.status === "manually_corrected")
    .sort((a,b) => Number(/dijabolik/i.test(b.title)) - Number(/dijabolik/i.test(a.title)) || (b.before.popularity ?? 0) - (a.before.popularity ?? 0) || b.evidence.restoredBlocks - a.evidence.restoredBlocks || a.id.localeCompare(b.id))
  const operations = layout.slice(0,limit)
  const errors = candidates.filter(row => row.rule === "flag_confirmed_error").slice(0,10)
  operations.push(...errors)
  const createdAt = new Date().toISOString(), output = path.join(ROOT,"reports/song-repairs","plan-"+createdAt.replace(/[:.]/g,"-"))
  const plan = { formatVersion:1, createdAt, sourceRoots:sources.roots, totalSongs:songs.length, counts, eligibleLayout:layout.length, entityCandidates:candidates.filter(row=>row.rule==="decode_html_entities").length, deferred:candidates.filter(row=>!operations.includes(row)).map(row=>({id:row.id,title:row.title,artist:row.artist,rule:row.rule,status:row.status})), operations }
  await fs.mkdir(output,{recursive:true})
  await fs.writeFile(path.join(output,"manifest.json"),JSON.stringify(plan,null,2),{flag:"wx"})
  await fs.writeFile(path.join(output,"index.html"),report(plan),{flag:"wx"})
  console.log(JSON.stringify({mode:"dry-run",databaseWrites:0,totalSongs:songs.length,counts,eligibleLayout:layout.length,entityCandidates:plan.entityCandidates,selected:operations.length,restoredSongs:operations.filter(row=>row.afterLyrics!==row.before.lyrics).length,statusOnly:errors.length,statuses:operations.reduce((all,row)=>(all[row.status]=(all[row.status]??0)+1,all),{}),manifest:path.join(output,"manifest.json"),preview:path.join(output,"index.html")},null,2))
}

async function apply(db, values, reportRoot = path.join(ROOT,"reports/song-repairs")) {
  if (!values.manifest || !values["reviewer-email"]) throw Error("Manifest and reviewer-email required")
  const file = path.resolve(values.manifest), stat = await fs.stat(file)
  if (stat.size > 20000000) throw Error("Manifest too large")
  const plan = JSON.parse(await fs.readFile(file,"utf8")), check = planner()
  if (plan.formatVersion!==1 || !Array.isArray(plan.operations) || plan.operations.length<1 || plan.operations.length>110 || new Set(plan.operations.map(row=>row.id)).size!==plan.operations.length) throw Error("Invalid manifest")
  const operations = plan.operations.map(op=>validateOperation(op,check)).sort((a,b)=>a.id.localeCompare(b.id))
  const output = path.join(reportRoot,"apply-"+new Date().toISOString().replace(/[:.]/g,"-"))
  await fs.mkdir(output,{recursive:true})
  await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE")
  try {
    await db.query("SET LOCAL lock_timeout = '5s'")
    const actors = (await db.query('SELECT id FROM public."User" WHERE lower(email)=lower($1) AND role=\'admin\' AND banned=false FOR SHARE',[values["reviewer-email"]])).rows
    if (actors.length!==1) throw Error("Exactly one active admin reviewer required")
    const actor=actors[0].id, ids=operations.map(op=>op.id)
    await db.query('SELECT id FROM public."Song" WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[ids])
    await db.query('SELECT "songId" FROM public."SongReview" WHERE "songId"=ANY($1::text[]) ORDER BY "songId" FOR UPDATE',[ids])
    const current=(await db.query(songSelect+' WHERE s.id=ANY($1::text[]) ORDER BY s.id',[ids])).rows
    if(current.length!==operations.length)throw Error("A selected song is missing")
    for(let i=0;i<operations.length;i++)if(current[i].id!==operations[i].id || contentVersion(current[i])!==operations[i].expectedVersion || PROTECTED.has(current[i].review?.status))throw Error("Content or status changed; regenerate plan")
    const counts=(await db.query('SELECT (SELECT count(*) FROM public."Song")::int AS songs,(SELECT count(*) FROM public."Favorite")::int AS favorites,(SELECT count(*) FROM public."PlaylistSong")::int AS links')).rows[0]
    const backup={formatVersion:1,manifest:file,manifestHash:hash(JSON.stringify(plan)),reviewerId:actor,createdAt:new Date().toISOString(),counts,songs:current,operations}
    await fs.writeFile(path.join(output,"before.json"),JSON.stringify(backup,null,2),{flag:"wx"})
    for(const op of operations){
      if(op.afterLyrics!==op.before.lyrics){
        const changed=await db.query('UPDATE public."Song" SET lyrics=$1 WHERE id=$2 AND lyrics IS NOT DISTINCT FROM $3 AND chords IS NOT DISTINCT FROM $4',[op.afterLyrics,op.id,op.before.lyrics,op.before.chords])
        if(changed.rowCount!==1)throw Error("Stale content")
      }
      await db.query('INSERT INTO public."SongReview" ("songId",status,"reviewedById","updatedAt") VALUES ($1,$2,$3,CURRENT_TIMESTAMP) ON CONFLICT ("songId") DO UPDATE SET status=EXCLUDED.status,"reviewedById"=EXCLUDED."reviewedById","updatedAt"=EXCLUDED."updatedAt"',[op.id,op.status,actor])
    }
    const after=(await db.query(songSelect+' WHERE s.id=ANY($1::text[]) ORDER BY s.id',[ids])).rows
    for(let i=0;i<after.length;i++){
      const row=after[i],before=current[i],op=operations[i]
      const metadata=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!["lyrics","review"].includes(key)))
      if(row.id!==op.id || row.lyrics!==op.afterLyrics || row.review?.status!==op.status || row.review?.reviewedById!==actor || JSON.stringify(metadata(row))!==JSON.stringify(metadata(before)))throw Error("Post-write verification failed")
    }
    const afterCounts=(await db.query('SELECT (SELECT count(*) FROM public."Song")::int AS songs,(SELECT count(*) FROM public."Favorite")::int AS favorites,(SELECT count(*) FROM public."PlaylistSong")::int AS links')).rows[0]
    if(JSON.stringify(counts)!==JSON.stringify(afterCounts))throw Error("Song/favorite/playlist preservation failed")
    await fs.writeFile(path.join(output,"after.json"),JSON.stringify(after,null,2),{flag:"wx"})
    await db.query("COMMIT")
    const summary={committed:true,changedLyrics:operations.filter(op=>op.afterLyrics!==op.before.lyrics).length,reviewedSongs:operations.length,verified:0,manuallyCorrected:operations.filter(op=>op.status==="manually_corrected").length,needsFix:operations.filter(op=>op.status==="needs_fix").length,preserved:afterCounts,backup:output}
    console.log(JSON.stringify(summary,null,2))
    await fs.writeFile(path.join(output,"summary.json"),JSON.stringify(summary,null,2),{flag:"wx"}).catch(()=>console.error("Changes committed; summary file could not be saved. Before/after backups remain available."))
  }catch(error){await db.query("ROLLBACK").catch(()=>{});throw error}
}
async function main(){
  const {values}=parseArgs({options:{ca:{type:"string"},sources:{type:"string",multiple:true},limit:{type:"string"},manifest:{type:"string"},"reviewer-email":{type:"string"},apply:{type:"boolean",default:false}}})
  loadEnvConfig(ROOT);const db=await databaseClient(values.ca)
  try{if(values.apply)await apply(db,values);else await prepare(db,values)}finally{await db.end()}
}
if(require.main===module)main().catch(error=>{console.error("Song repair did not complete:",error.code||error.message);process.exitCode=1})
module.exports={prepare,apply,songSelect,report}
