/* eslint-disable @typescript-eslint/no-require-imports -- Shared transaction logic for the admin API and real PostgreSQL regression tests. */
const {randomUUID}=require('node:crypto')
const {hash,credit,validSource,eligibleDiscography,saveProfile}=require('./artist-wiki-store.cjs')
const catalog=require('../../lib/monitoring/catalog-review-data.json')
const json=value=>JSON.parse(JSON.stringify(value))
class ActionError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(condition,message,status=409)=>{if(!condition)throw new ActionError(status,message)}
const identity=a=>({id:a.id,name:a.name,slug:a.slug,category:a.category})
const value=(a,field)=>field==='bio'?{bio:a.bio,bioShort:a.bioShort}:a.discography
const emptyDiscography=v=>v==null||Array.isArray(v)&&!v.length||typeof v==='string'&&!v.trim()
async function actor(db,id){const a=(await db.query('SELECT id,role,banned FROM public."User" WHERE id=$1',[id])).rows[0];fail(a&&a.role==='admin'&&!a.banned,'Nije dozvoljeno.',403)}
async function event(db,id,action,actorId){await db.query('INSERT INTO public."AdminContentEvent" (id,"proposalId",action,"actorId") VALUES ($1,$2,$3,$4)',[randomUUID(),id,action,actorId])}
async function artist(db,id){const a=(await db.query('SELECT id,name,slug,category,bio,"bioShort",discography,discography IS NULL AS "discographySqlNull" FROM public."Artist" WHERE id=$1 FOR UPDATE',[id])).rows[0];fail(a,'Izvođač nije pronađen.',404);return a}
async function profile(db,id){return json((await db.query('SELECT *,"bioSource" IS NULL AS "bioSourceSqlNull","discographySource" IS NULL AS "discographySourceSqlNull" FROM public."ArtistWikiProfile" WHERE "artistId"=$1 FOR UPDATE',[id])).rows[0]||null)}
function finding(id){return catalog.findings.find(f=>f.id===id)}
async function reserve(db,actorId,input){
 await actor(db,actorId)
 fail(['bio','discography'].includes(input.field),'Izaberi biografiju ili diskografiju.',400)
 await db.query("SELECT pg_advisory_xact_lock(hashtext('admin-content:'||$1))::text",[actorId])
 const recent=(await db.query('SELECT count(*)::int AS n FROM public."AdminContentProposal" WHERE "actorId"=$1 AND "createdAt">CURRENT_TIMESTAMP-INTERVAL \'1 day\' AND operation=\'replace\'',[actorId])).rows[0].n
 fail(recent<20,'Dnevni limit je 20 priprema. Iskoristi postojeće predloge ili nastavi sutra.',429)
 const working=(await db.query('SELECT id FROM public."AdminContentProposal" WHERE "actorId"=$1 AND status=\'working\' AND "updatedAt">CURRENT_TIMESTAMP-INTERVAL \'2 minutes\' LIMIT 1',[actorId])).rows
 fail(!working.length,'Priprema je već u toku. Sačekaj da se završi.',429)
 const a=await artist(db,input.subjectId),known=finding(input.findingId)
 if(known){fail(known.subject==='artist'&&known.subjectId===a.id&&known.field===input.field&&hash(a[input.field])===known.expectedHash&&a.name===known.name&&a.slug===known.slug&&a.category===known.category,'Nalaz je zastareo. Osveži pregled pre pripreme.')}
 else fail(input.findingId===`missing-${input.field}-${a.id}`&&(input.field==='bio'?!a.bio?.trim():emptyDiscography(a.discography)),'Ovo polje više nije prazno. Otvori aktuelan nalaz ili editor.')
 const id=randomUUID(),data={identity:identity(a),before:json(value(a,input.field)),discographySqlNull:a.discographySqlNull,after:null,source:null,ai:{status:'not-requested'},note:'Priprema proverljivog izvora.'}
 await db.query('INSERT INTO public."AdminContentProposal" (id,"findingId","subjectId",field,operation,status,data,"actorId") VALUES ($1,$2,$3,$4,\'replace\',\'working\',$5::jsonb,$6)',[id,input.findingId,a.id,input.field,JSON.stringify(data),actorId])
 return{id,artist:a,data}
}
async function complete(db,id,actorId,candidate,error){
 await actor(db,actorId)
 const p=(await db.query('SELECT * FROM public."AdminContentProposal" WHERE id=$1 FOR UPDATE',[id])).rows[0]
 fail(p&&p.actorId===actorId&&p.status==='working','Priprema više nije aktivna.')
 const data={...p.data,...candidate,...(error?{note:error}:{})},status=error?'failed':'ready'
 await db.query('UPDATE public."AdminContentProposal" SET data=$2::jsonb,status=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1',[id,JSON.stringify(data),status]);await event(db,id,error?'failed':'prepared',actorId)
 return{...p,status,data}
}
async function clearProposal(db,actorId,input){
 await actor(db,actorId)
 const known=finding(input.findingId)
 fail(known?.subject==='artist'&&known.field==='bio'&&known.confidence==='confirmed-mismatch','Uklanjanje je dostupno samo za potvrđeno pogrešnu biografiju.',400)
 const a=await artist(db,known.subjectId)
 fail(hash(a.bio)===known.expectedHash&&a.name===known.name&&a.slug===known.slug&&a.category===known.category,'Biografija je menjana posle nalaza. Osveži pregled.')
 const id=randomUUID(),data={identity:identity(a),before:json(value(a,'bio')),after:{bio:null,bioShort:null},source:null,ai:{status:'not-needed'},note:known.observed+' Uklanja se samo biografija i njen kratki prikaz; izvođač i pesme ostaju sačuvani.'}
 await db.query('INSERT INTO public."AdminContentProposal" (id,"findingId","subjectId",field,operation,status,data,"actorId") VALUES ($1,$2,$3,\'bio\',\'clear\',\'ready\',$4::jsonb,$5)',[id,known.id,a.id,JSON.stringify(data),actorId]);await event(db,id,'prepared',actorId)
 return{id,data,status:'ready',field:'bio',operation:'clear',findingId:known.id,subjectId:a.id}
}
async function apply(db,actorId,id,confirmation){
 await actor(db,actorId)
 const p=(await db.query('SELECT * FROM public."AdminContentProposal" WHERE id=$1 FOR UPDATE',[id])).rows[0]
 fail(p&&p.status==='ready','Predlog više nije spreman za primenu.')
 const d=p.data,a=await artist(db,p.subjectId)
 fail(confirmation===a.name,'Za potvrdu upiši tačan naziv izvođača.',400)
 fail(hash(identity(a))===hash(d.identity)&&hash(value(a,p.field))===hash(d.before)&&(p.field!=='discography'||a.discographySqlNull===d.discographySqlNull),'Sadržaj je u međuvremenu menjan. Pripremi novi predlog.')
 fail(p.operation==='clear'||p.operation==='replace'&&validSource(d.source),'Predlog nema potvrđen izvor.',400)
 if(p.field==='bio')fail(d.after&&('bio' in d.after)&&(p.operation==='clear'?d.after.bio===null:typeof d.after.bio==='string'&&d.after.bio.length>=200&&d.after.bio.length<=20000),'Neispravna biografija.',400)
 else fail(p.field==='discography'&&eligibleDiscography(d.after),'Neispravna diskografija.',400)
 const profileBefore=await profile(db,a.id)
 if(p.field==='bio')await db.query('UPDATE public."Artist" SET bio=$1,"bioShort"=$2 WHERE id=$3',[d.after.bio,d.after.bioShort,a.id])
 else await db.query('UPDATE public."Artist" SET discography=$1::jsonb WHERE id=$2',[JSON.stringify(d.after),a.id])
 if(p.operation==='replace')await saveProfile(db,a,{wikidataId:d.wikidataId,state:'admin-approved'},{[p.field]:credit(p.field==='bio'?d.after.bio:d.after,d.source)})
 else await db.query('UPDATE public."ArtistWikiProfile" SET "bioSource"=NULL,"checkedAt"=CURRENT_TIMESTAMP WHERE "artistId"=$1',[a.id])
 const data={...d,profileBefore,profileAfter:await profile(db,a.id)}
 await db.query('UPDATE public."AdminContentProposal" SET status=\'applied\',data=$2::jsonb,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1',[p.id,JSON.stringify(data)]);await event(db,p.id,'applied',actorId)
 return{...p,status:'applied',data,artist:a}
}
async function undo(db,actorId,id,confirmation){
 await actor(db,actorId)
 const p=(await db.query('SELECT * FROM public."AdminContentProposal" WHERE id=$1 FOR UPDATE',[id])).rows[0]
 fail(p?.status==='applied'&&p.field!=='finding','Ova izmena ne može da se vrati.')
 const d=p.data,a=await artist(db,p.subjectId)
 fail(confirmation===a.name,'Za potvrdu upiši tačan naziv izvođača.',400)
 fail(hash(identity(a))===hash(d.identity)&&hash(value(a,p.field))===hash(d.after)&&hash(await profile(db,a.id))===hash(d.profileAfter),'Posle ove izmene sadržaj ili izvor su ponovo menjani. Vraćanje je zaustavljeno da ih sačuva.')
 if(p.field==='bio')await db.query('UPDATE public."Artist" SET bio=$1,"bioShort"=$2 WHERE id=$3',[d.before.bio,d.before.bioShort,a.id])
 else await db.query('UPDATE public."Artist" SET discography=$1::jsonb WHERE id=$2',[d.discographySqlNull?null:JSON.stringify(d.before),a.id])
 if(d.profileBefore){const old=d.profileBefore;await db.query('UPDATE public."ArtistWikiProfile" SET "artistName"=$2,slug=$3,"wikidataId"=$4,state=$5,"bioSource"=$6::jsonb,"discographySource"=$7::jsonb,"checkedAt"=$8 WHERE "artistId"=$1',[a.id,old.artistName,old.slug,old.wikidataId,old.state,old.bioSourceSqlNull?null:JSON.stringify(old.bioSource),old.discographySourceSqlNull?null:JSON.stringify(old.discographySource),old.checkedAt])}
 else await db.query('DELETE FROM public."ArtistWikiProfile" WHERE "artistId"=$1',[a.id])
 await db.query('UPDATE public."AdminContentProposal" SET status=\'undone\',"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1',[p.id]);await event(db,p.id,'undone',actorId)
 return{...p,status:'undone',artist:a}
}
async function discard(db,actorId,id){await actor(db,actorId);const p=(await db.query('SELECT * FROM public."AdminContentProposal" WHERE id=$1 FOR UPDATE',[id])).rows[0];fail(p?.status==='ready','Predlog više nije aktivan.');await db.query('UPDATE public."AdminContentProposal" SET status=\'discarded\',"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1',[id]);await event(db,id,'discarded',actorId);return{...p,status:'discarded'}}
async function decision(db,actorId,input){
 await actor(db,actorId);const f=finding(input.findingId);fail(f&&['resolve','dismiss','reopen'].includes(input.decision),'Nepoznat nalaz ili odluka.',400)
 const id=randomUUID(),data={note:f.observed,expectedHash:f.expectedHash,name:f.name,decision:input.decision}
 await db.query('INSERT INTO public."AdminContentProposal" (id,"findingId","subjectId",field,operation,status,data,"actorId") VALUES ($1,$2,$3,\'finding\',$4,\'applied\',$5::jsonb,$6)',[id,f.id,f.subjectId,input.decision,JSON.stringify(data),actorId]);await event(db,id,input.decision,actorId)
 return{id,status:'applied',data}
}
module.exports={ActionError,identity,value,reserve,complete,clearProposal,apply,undo,discard,decision,finding}
