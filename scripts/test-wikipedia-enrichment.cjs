/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server tests; no network or production writes. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module')
const store=require('./lib/artist-wiki-store.cjs'),core=require('./lib/artist-wiki-core.cjs')
const source={language:'sr',title:'Probni bend',pageId:1,revisionId:2,url:'https://sr.wikipedia.org/wiki/Probni_bend',revisionUrl:'https://sr.wikipedia.org/w/index.php?oldid=2',historyUrl:'https://sr.wikipedia.org/w/index.php?title=Probni+bend&action=history',license:'https://creativecommons.org/licenses/by-sa/4.0/'}
const bio='Probni bend je muzička grupa poznata po albumima i koncertnim nastupima. '.repeat(5)
let state,proposal,mutate,failCredit,callbacks,lookups,refreshes
const db={
  artist:{findUnique:async()=>structuredClone(state.artist),update:async({data})=>Object.assign(state.artist,data)},
  $queryRawUnsafe:async(sql,...values)=>{
    if(sql.startsWith('SELECT "wikidataId"'))return [structuredClone(state.profile)]
    if(sql.startsWith('UPDATE')){if(state.profile.state==='working'&&Date.now()-new Date(state.profile.checkedAt).getTime()<300000)return [];state.profile.state='working';return [{artistId:'a'}]}
    if(sql.startsWith('SELECT *'))return [structuredClone(state.artist)]
    if(sql.startsWith('INSERT')){if(failCredit)throw Error('credit-failed');state.profile={state:values[4],bioSource:values[5]&&JSON.parse(values[5]),discographySource:values[6]&&JSON.parse(values[6])};return []}
    throw Error('Unexpected SQL')
  },
  $transaction:async work=>{const before=structuredClone(state);try{return await work(db)}catch(e){state=before;throw e}},
}
const original=Module._load
Module._load=function(request,parent,main){
  if(request==='@/lib/prisma')return {prisma:db}
  if(request==='next/server')return {after:fn=>callbacks.push(fn)}
  if(request==='next/cache')return {revalidatePath:()=>{}}
  if(request==='@/lib/wikiCreditsCache')return {refreshWikiCredits:()=>{refreshes++}}
  if(request==='@/scripts/lib/artist-wiki-core.cjs')return {planBio:core.planBio,wikipediaClient:()=>({}),discoverContent:async()=>{lookups++;mutate?.();return proposal}}
  if(request==='@/scripts/lib/artist-wiki-store.cjs')return store
  return original.call(this,request,parent,main)
}
let service
try{service=require('../lib/artists/wikipedia.ts')}finally{Module._load=original}
beforeEach(()=>{
  state={artist:{id:'a',name:'Probni bend',slug:'probni-bend',category:'domace',bio:null,discography:null,image:'keep.jpg'},profile:{state:'pending',checkedAt:new Date(0)}}
  proposal={state:'identified-content',wikidataId:'Q123',bio,bioSource:source,discography:[{title:'Prvi album',year:'2000',kind:'studio'}],discographySource:source}
  mutate=null;failCredit=false;callbacks=[];lookups=0;refreshes=0
})
test('new artist enrichment stores content and exact source hashes atomically',async()=>{
  service.queueArtistWikipedia('a');assert.equal(lookups,0);await callbacks[0]()
  assert.equal(state.artist.bio,bio);assert.equal(state.artist.image,'keep.jpg')
  assert.equal(state.profile.bioSource.hash,store.hash(bio));assert.equal(state.profile.discographySource.hash,store.hash(state.artist.discography))
  assert.equal(refreshes,1)
})
test('manual edits made during a Wikipedia lookup are preserved',async()=>{
  mutate=()=>{state.artist.bio='Ručna biografija';state.artist.discography=[{title:'Ručni album'}]}
  await service.enrichArtistWikipedia('a');assert.equal(state.artist.bio,'Ručna biografija');assert.equal(state.artist.discography[0].title,'Ručni album')
  assert.equal(state.profile.bioSource,null);assert.equal(state.profile.discographySource,null)
})
test('a failed attribution write rolls back content updates',async()=>{
  failCredit=true;await assert.rejects(service.enrichArtistWikipedia('a'),/credit-failed/);assert.equal(state.artist.bio,null);assert.equal(state.artist.discography,null)
  assert.equal(refreshes,0)
})
test('concurrent work and recent completed lookups do not cause repeated requests',async()=>{
  state.profile={state:'working',checkedAt:new Date(),wikidataId:'Q123'};await service.enrichArtistWikipedia('a');assert.equal(lookups,0)
  state.profile.state='not-found';await service.enrichArtistWikipedia('a');assert.equal(lookups,0)
})
test('missing or malformed sources and future albums cannot be published',async()=>{
  proposal.bioSource=null;proposal.discography=[{title:'Future',year:'2099',kind:'studio'}]
  await service.enrichArtistWikipedia('a');assert.equal(state.artist.bio,null);assert.equal(state.artist.discography,null)
  assert.equal(store.validSource({...source,revisionUrl:'https://evil.example/wiki'}),false)
})
test('ambiguous identities leave content empty and retain the review state',async()=>{
  proposal={state:'ambiguous'};await service.enrichArtistWikipedia('a');assert.equal(state.artist.bio,null);assert.equal(state.profile.state,'ambiguous')
})
test('reordered person names match without losing word multiplicity',()=>{
  const {nameMatches}=require('./lib/artist-image-core.cjs')
  assert.equal(nameMatches('Belan Neno',{labels:{hr:{value:'Neno Belan'}}}),true)
  assert.equal(nameMatches('Bend Bend',{labels:{en:{value:'Bend Drugi'}}}),false)
})
test('omitted attribution uses SQL NULL, preserving the previous source on conflict',async()=>{
  await store.saveProfile({query:async(sql,values)=>{assert.equal(values[5],null);assert.equal(values[6],null)}},state.artist,{state:'not-found'})
})
test('an abandoned lease can resume without waiting for the daily completed-work limit',async()=>{
  state.profile={state:'working',checkedAt:new Date(Date.now()-600000)}
  await service.enrichArtistWikipedia('a');assert.equal(lookups,1);assert.equal(state.artist.bio,bio)
})
test('bulk publication refuses an unpublished credit UI before connecting to the database',async()=>{
  const {applyReport,validatePlan}=require('./apply-completed-artist-wiki.cjs')
  const artist={...state.artist,proposal,changes:{bio:{before:null,after:bio}}},report={source:'live-database',artists:[artist]}
  let connected=false
  await assert.rejects(applyReport(report,null,'https://example.test',{verify:async()=>{throw Error('DEPLOY_DATABASE_CREDITS_FIRST')},connect:async()=>{connected=true}}),/DEPLOY_DATABASE_CREDITS_FIRST/)
  assert.equal(connected,false)
  assert.throws(()=>validatePlan({...report,artists:[artist,artist]}),/INVALID_ARTIST_ID/)
  assert.throws(()=>validatePlan({...report,artists:[{...artist,proposal:{...proposal,bioSource:null}}]}),/PINNED_SOURCE_REQUIRED/)
})
test('strict publication excludes generic discography song tables and marked singles',()=>{
  const html='<h2>Discography</h2><table><tr><th>Title</th><th>Year</th></tr><tr><td><i>Song A; Song B; Song C</i></td><td>2019</td></tr></table><h3>Albums</h3><ul><li>Real album (2020)</li><li>Later song [single] (2021)</li></ul><h3>Studio albums</h3><ul><li>Studio release (2022)</li></ul>'
  assert.deepEqual(core.extractArticle(html,{strictAlbums:true}).albums.map(a=>a.title),['Real album','Studio release'])
})
