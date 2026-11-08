/* eslint-disable @typescript-eslint/no-require-imports -- Isolated admin review fixtures; no live database. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),{createHash}=require('node:crypto')
const {hash}=require('./lib/artist-wiki-store.cjs')
let allowed,authCalls,cache,artist,song,reads
const findings=[{id:'bio-a',kind:'biografije',subject:'artist',subjectId:'a',name:'Bend',slug:'bend',category:'domace',field:'bio',expectedHash:hash('original-unrelated-biography'),title:'Biografija zahteva proveru',observed:'Pogrešna tema.',next:'Pripremiti odgovarajući izvor.',confidence:'confirmed-mismatch',requiresApproval:true},{id:'song-s',kind:'akordi',subject:'song',subjectId:'s',name:'Bend — Pesma',field:'song',expectedHash:createHash('sha256').update(JSON.stringify(['C G\nProbni red',null])).digest('hex'),title:'Proveriti zapis',observed:'Red 1.',next:'Pregledati.',confidence:'technical-warning',requiresApproval:true}]
const raw={version:1,checkedAt:'2026-11-08T10:00:00Z',songCheckedAt:'2026-11-08T10:00:00Z',summary:{artists:1,biographies:1,discographies:0,photos:0,songs:1,songsNeedingTechnicalReview:1,findingsShown:2},findings}
const original=Module._load
Module._load=function(request,parent,main){
 if(request==='@/lib/adminSongs/server')return{requireSongAdmin:async()=>{authCalls++;if(!allowed)throw Error('forbidden')}}
 if(request==='next/cache')return{unstable_cache:work=>async()=>cache??(cache=await work())}
 if(request==='@/lib/prisma')return{prisma:{artist:{findMany:async()=>{reads++;return artist?[artist]:[]}},song:{findMany:async()=>{reads++;return song?[song]:[]}}}}
 if(request==='./catalog-review-data.json'&&parent.filename.endsWith('catalog-review.ts'))return raw
 if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2))
 return original.call(this,request,parent,main)
}
let service
try{service=require('../lib/monitoring/catalog-review.ts')}finally{Module._load=original}
beforeEach(()=>{allowed=true;authCalls=0;cache=null;reads=0;artist={id:'a',name:'Bend',slug:'bend',category:'domace',bio:'original-unrelated-biography',discography:[],image:null};song={id:'s',title:'Pesma',slug:'pesma',category:'domace',lyrics:'C G\nProbni red',chords:null,artist:{name:'Bend',slug:'bend'}}})
test('current hashes and exact public/edit links make a finding reviewable without exposing the content',async()=>{
 const result=await service.readCatalogReview()
 assert.equal(result.findings[0].state,'unchanged');assert.equal(result.findings[0].href,'/biografija/domace/bend')
 assert.equal(result.findings[0].editHref,'/admin/artists/a/edit');assert.equal(result.findings[1].href,'/pesme/domace/bend/pesma')
 assert.doesNotMatch(JSON.stringify(result),/original-unrelated-biography|Probni red/)
})
test('manual edits become a stale finding, never an assumed resolution or a reason to overwrite',async()=>{
 artist.bio='New manual biography';song.lyrics='Manually corrected text'
 const result=await service.readCatalogReview()
 assert.deepEqual(result.findings.map(row=>row.state),['changed','changed'])
 assert.equal(artist.bio,'New manual biography')
})
test('removed records lose their links, and cached admin data still requires authorization',async()=>{
 artist=null;song=null
 const result=await service.readCatalogReview()
 assert.ok(result.findings.every(row=>row.state==='removed'&&row.href===null&&row.editHref===null))
 allowed=false;await assert.rejects(service.readCatalogReview(),/forbidden/);assert.equal(authCalls,2);assert.equal(reads,2)
})
test('filters accept only known categories and bounded page values',()=>{
 assert.deepEqual(service.reviewSelection('akordi','2'),{kind:'akordi',page:2})
 for(const value of ['../admin','https://evil.example',null,['akordi']])assert.equal(service.reviewSelection(value,'-2').kind,'sve')
 assert.equal(service.reviewSelection('slike','1000000000000000').page,1)
})
