/* eslint-disable @typescript-eslint/no-require-imports -- ISR data boundaries and real admin mutation handlers with an isolated in-memory database. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),cheerio=require('cheerio'),root=path.join(__dirname,'..')
const store=new Map(),definitions=[],events=[];let state,reads,down,now,tagFailure,pathFailure
const db={
 user:{findUnique:async()=>({id:'admin',role:'admin',banned:false})},
 artist:{findUnique:async()=>structuredClone(state.artist),update:async({data})=>{Object.assign(state.artist,data);return structuredClone(state.artist)}},
 song:{updateMany:async()=>({count:0})},
 $transaction:async work=>work(db),
 $queryRawUnsafe:async(_sql,id)=>{reads++;if(down)throw down;const a=state.artist,p=state.profile;return (!id||id===a.id)&&p.artistName===a.name&&p.slug===a.slug?[{...structuredClone(p),category:a.category,bio:a.bio,discography:a.discography}]:[]},
}
const original=Module._load
Module._load=function(request,parent,main){
 if(request==='react')return{...React,cache:fn=>fn}
 if(request==='@/lib/prisma')return{prisma:db}
 if(request==='@/lib/adminSongs/server')return{requireSongAdmin:async()=>({id:'admin'}),refreshAdminSongs(){},adminSongBody:async req=>req.json(),adminSongFailure:()=>Response.json({error:'error'},{status:500})}
 if(request==='next/cache')return{
  unstable_cache:(fn,keys,options)=>{definitions.push({keys,options});return async(...args)=>{const key=JSON.stringify([keys,args]),hit=store.get(key);if(hit&&hit.expires>now)return structuredClone(hit.value);const value=await fn(...args);store.set(key,{value:structuredClone(value),expires:now+options.revalidate*1000,tags:options.tags});return value}},
  revalidateTag:tag=>{events.push(['tag',tag]);if(tagFailure)throw Error('cache');for(const [key,row]of store)if(row.tags.includes(tag))store.delete(key)},
  revalidatePath:url=>{events.push(['path',url]);if(pathFailure)throw Error('cache')},
 }
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
let service,policy,page,admin,route,manifest,hash
try{service=require('../lib/artistWikiServer.ts');policy=require('../lib/wikiCreditsCache.ts');page=require('../app/wiki-izvori/page.tsx');admin=require('../lib/adminContent/server.ts');route=require('../app/api/admin/artists/[id]/route.ts');({artistWikiManifest:manifest,wikiValueHash:hash}=require('../lib/artistWiki.ts'))}finally{Module._load=original}
function source(value,revision=42){return{hash:hash(value),language:'sr',title:'Probni izvor '+revision,pageId:123,revisionId:revision,timestamp:'2026-11-12T12:00:00Z',url:'https://sr.wikipedia.org/wiki/Fixture',revisionUrl:'https://sr.wikipedia.org/w/index.php?oldid='+revision,historyUrl:'https://sr.wikipedia.org/w/index.php?title=Fixture&action=history',license:'https://creativecommons.org/licenses/by-sa/4.0/',changes:'Proveren javni izvor',author:'Original author metadata'}}
beforeEach(()=>{store.clear();events.length=0;reads=0;down=null;now=0;tagFailure=pathFailure=false;state={artist:{id:'isr-fixture',name:'ISR izvođač',slug:'isr-fixture',category:'domace',image:null,bio:'Probna izvorna biografija',bioShort:null,discography:[{title:'Album',year:'2001'}]}};state.profile={artistId:state.artist.id,artistName:state.artist.name,slug:state.artist.slug,wikidataId:'Q123',bioSource:source(state.artist.bio),discographySource:source(state.artist.discography,43)}})
const own=rows=>rows.find(row=>row.artistId==='isr-fixture')
const request=(body,method)=>new Request('https://site.test/api/admin/artists/isr-fixture',{method,headers:{origin:'https://site.test','content-type':'application/json'},body:JSON.stringify(body)})
const context={params:Promise.resolve({id:'isr-fixture'})}

test('separate requests reuse the complete public list for 1800 seconds and then observe refreshed data',async()=>{
 const first=await service.allArtistWikiCredits();state.profile.bioSource=source(state.artist.bio,99)
 now=1799999;assert.equal(own(await service.allArtistWikiCredits()).bio.revisionId,42);assert.equal(reads,1)
 now=1800000;assert.equal(own(await service.allArtistWikiCredits()).bio.revisionId,99);assert.equal(reads,2)
 assert.equal(page.revalidate,1800);assert.equal(page.dynamic,undefined)
 assert.ok(definitions.some(d=>d.options.revalidate===1800&&d.options.tags.includes(policy.WIKI_CREDITS_TAG)&&d.keys.includes(hash(manifest))))
 for(const a of manifest.artists.filter(a=>a.bio||a.discography))assert.deepEqual(first.find(row=>row.artistId===a.artistId),a)
 assert.deepEqual(own(first).bio,source('Probna izvorna biografija'));assert.ok(Buffer.byteLength(JSON.stringify(first))<2*1024*1024)
})

test('real admin edit invalidates both layers after commit; next read cannot retain the old source',async()=>{
 await service.allArtistWikiCredits();const before=structuredClone(state.artist)
 const response=await route.PATCH(request({name:before.name,category:'domace',image:'',bio:'Administrativno izmenjena biografija',discography:JSON.stringify(before.discography),version:admin.artistContentVersion(before)},'PATCH'),context)
 assert.equal(response.status,200);assert.equal(state.artist.bio,'Administrativno izmenjena biografija')
 assert.ok(events.some(e=>e[0]==='tag'&&e[1]===policy.WIKI_CREDITS_TAG));assert.ok(events.some(e=>e[0]==='path'&&e[1]==='/wiki-izvori'))
 const updated=own(await service.allArtistWikiCredits());assert.equal(updated.bio,undefined);assert.equal(updated.discography.revisionId,43);assert.equal(reads,2)
})

test('real admin biography deletion drops its outdated citation while retaining the discography credit',async()=>{
 await service.allArtistWikiCredits();const response=await route.DELETE(request({name:state.artist.name,version:admin.artistContentVersion(state.artist)},'DELETE'),context)
 assert.equal(response.status,200);const updated=own(await service.allArtistWikiCredits());assert.equal(updated.bio,undefined);assert.equal(updated.discography.hash,hash(state.artist.discography));assert.equal(reads,2)
})

test('source refresh publishes its new revision immediately after explicit invalidation',async()=>{
 await service.allArtistWikiCredits();state.artist.bio='Novo provereno izdanje';state.profile.bioSource=source(state.artist.bio,999)
 policy.refreshWikiCredits();const updated=own(await service.allArtistWikiCredits());assert.equal(updated.bio.revisionId,999);assert.equal(updated.bio.hash,hash(state.artist.bio));assert.equal(reads,2)
})

test('rendered credits preserve every anchor, license, revision, contributor link and manifest checksum',async()=>{
 const rows=await service.allArtistWikiCredits(),$=cheerio.load(renderToStaticMarkup(await page.default()))
 assert.equal($('[data-artist-wiki-storage]').attr('data-artist-wiki-storage'),'database');assert.equal($('[data-artist-wiki-manifest]').attr('data-artist-wiki-manifest'),hash(manifest));assert.equal($('article').length,rows.length)
 for(const a of rows){const article=$('article').filter((_,el)=>$(el).attr('id')===a.artistId);assert.equal(article.length,1);assert.ok(article.find('h2').text().includes(a.artistName));for(const field of ['bio','discography'])if(a[field]){const s=a[field];assert.equal(article.find('a').filter((_,el)=>$(el).attr('href')===s.revisionUrl).length>=1,true);assert.ok(article.text().includes(String(s.revisionId)));assert.ok(article.find('a').toArray().some(el=>$(el).attr('href')===s.historyUrl));assert.ok(article.find('a[rel*="license"]').toArray().some(el=>$(el).attr('href')===s.license))}}
})

test('transient failures are not stored as successful partial credits; a missing optional table retains manifest support',async()=>{
 down=Error('temporary');await assert.rejects(service.allArtistWikiCredits(),/temporary/);assert.equal(store.size,0)
 down=null;assert.ok(own(await service.allArtistWikiCredits()));assert.equal(reads,2)
 store.clear();down={code:'P2010',meta:{code:'42P01'}};const fallback=await service.allArtistWikiCredits();assert.equal(fallback.length,manifest.artists.filter(a=>a.bio||a.discography).length)
})

test('both invalidations are attempted even when one cache layer fails',()=>{
 const warn=console.warn;console.warn=()=>{};try{tagFailure=true;policy.refreshWikiCredits();assert.ok(events.some(e=>e[0]==='path'));events.length=0;tagFailure=false;pathFailure=true;policy.refreshWikiCredits();assert.ok(events.some(e=>e[0]==='tag'))}finally{console.warn=warn}
})

test('manual artist saves invalidate both administrative content views even if cache invalidation fails',()=>{
 const warn=console.warn;console.warn=()=>{}
 try{tagFailure=true;admin.refreshArtistContent(state.artist);assert.ok(events.some(e=>e[0]==='tag'&&e[1]==='admin-content-backlog'));assert.ok(events.some(e=>e[0]==='tag'&&e[1]==='admin-catalog-review'));assert.ok(events.some(e=>e[0]==='path'&&e[1]==='/admin/nadzor'))}finally{console.warn=warn}
})
