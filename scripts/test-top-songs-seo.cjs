/* eslint-disable @typescript-eslint/no-require-imports -- Public ranking, editorial guards and cache invalidation without DB writes. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),{createHash}=require('node:crypto'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio')
const root=path.resolve(__dirname,'..'),original=Module._load,entries=new Map(),definitions=[]
const song=(id,popularity=100,category='domace',lyrics='Am C\nZapis pesme')=>({id,title:'Pesma '+id,slug:id,category,popularity,lyrics,chords:null,artist:{id:'artist',name:'Izvođač',slug:'izvodjac',category},privateValue:'never-cache-user-data'})
const initial=[song('duplicate',1000),song('preferred',990),song('fragment',999,'strane','Em\nPočetni fragment'),song('complete',995,'strane','Em C G\nCeo zapis'),...Array.from({length:60},(_,i)=>song('ordinary-'+String(i).padStart(2,'0'),900-i))]
const snapshot=id=>{const s=initial.find(s=>s.id===id);return{id:s.id,title:s.title,slug:s.slug,artistId:s.artist.id,artistSlug:s.artist.slug,category:s.artist.category,fingerprint:createHash('sha256').update(JSON.stringify([s.lyrics,s.chords])).digest('hex')}}
const rules=[{kind:'duplicate',source:snapshot('duplicate'),target:snapshot('preferred')},{kind:'incomplete',source:snapshot('fragment'),target:snapshot('complete')}]
let rows,calls,reviewDown,listDown,readTopSongs,pages
const prisma={song:{findMany:async q=>{calls.push(q);if(q.where.id?.in){if(reviewDown)throw Error('review lookup unavailable');return rows.filter(s=>q.where.id.in.includes(s.id))}if(listDown)throw Error('list lookup unavailable');return rows.filter(s=>s.category===q.where.category&&q.where.artist.category.in.includes(s.artist.category)&&!q.where.id?.notIn?.includes(s.id)).sort((a,b)=>b.popularity-a.popularity||a.id.localeCompare(b.id)).slice(0,q.take)},update:()=>{throw Error('No writes')},delete:()=>{throw Error('No writes')}}}
Module._load=function(request,parent,main){
 if(request==='./song-search-review-rules.json')return rules
 if(request==='@/lib/prisma')return{prisma}
 if(request==='react')return{...React,cache:fn=>fn}
 if(request==='next/cache')return{unstable_cache:(fn,keys,options)=>{definitions.push({keys,options});return(...args)=>{const key=JSON.stringify([keys,args]);if(!entries.has(key)){const pending=Promise.resolve().then(()=>fn(...args)).catch(e=>{entries.delete(key);throw e});entries.set(key,{tags:options.tags,promise:pending})}return entries.get(key).promise}}}
 if(request==='next/link')return{__esModule:true,default:props=>{const clean={...props};delete clean.prefetch;return React.createElement('a',clean,clean.children)}}
 if(request==='@/app/components/UiText')return{__esModule:true,default:({text})=>text}
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
try{readTopSongs=require('../lib/topSongsServer.ts').readTopSongs;pages=Object.fromEntries(['domace','narodne','strane'].map(c=>[c,require('../app/top-50/'+c+'/page.tsx')]))}finally{Module._load=original}
const invalidate=tag=>{for(const [key,value] of entries)if(value.tags.includes(tag))entries.delete(key)}
beforeEach(()=>{rows=structuredClone(initial);calls=[];reviewDown=false;listDown=false;entries.clear()})

test('Top 50 fills from eligible ranked records while excluding only version-verified sources',async()=>{
 const domestic=await readTopSongs('domace'),foreign=await readTopSongs('strane')
 assert.equal(domestic.length,50);assert.equal(domestic[0].id,'preferred');assert.ok(!domestic.some(s=>s.id==='duplicate'));assert.equal(domestic.at(-1).id,'ordinary-48')
 assert.deepEqual(foreign.map(s=>s.id),['complete'])
 const listQuery=calls.find(q=>q.where.category==='domace');assert.equal(listQuery.take,50);assert.deepEqual(listQuery.orderBy,[{popularity:'desc'},{id:'asc'}]);assert.deepEqual(listQuery.where.id.notIn,['duplicate','fragment'])
 assert.equal(listQuery.select.lyrics,undefined);assert.equal(listQuery.select.chords,undefined);assert.equal(listQuery.include,undefined);assert.deepEqual(listQuery.select.artist,{select:{name:true,slug:true,category:true}})
 assert.doesNotMatch(JSON.stringify(domestic),/lyrics|chords|never-cache|privateValue|artistId/)
})
test('warm lists reuse public metadata; categories stay isolated and invalid categories skip all reads',async()=>{
 await readTopSongs('domace');await readTopSongs('domace');await readTopSongs('strane');await readTopSongs('narodne');assert.equal(calls.length,4)
 assert.deepEqual(await readTopSongs('private'),[]);assert.equal(calls.length,4)
 const cached=definitions.find(d=>d.keys[0]==='public-top-songs-v1');assert.equal(cached.options.revalidate,60);assert.ok(cached.options.tags.includes('seo-sitemap'));assert.ok(cached.options.tags.includes('public-home-songs'))
})
test('admin invalidation restores an edited fragment and a source whose canonical target changed',async()=>{
 await readTopSongs('strane');await readTopSongs('domace')
 rows.find(s=>s.id==='fragment').lyrics+='\nDovršen zapis.';rows.find(s=>s.id==='preferred').lyrics+='\nDrugačiji zapis.'
 invalidate('seo-sitemap')
 assert.equal((await readTopSongs('strane'))[0].id,'fragment');assert.equal((await readTopSongs('domace'))[0].id,'duplicate')
})
test('content identity changes never hide an unrelated or renamed record after cache invalidation',async()=>{
 await readTopSongs('domace');rows.find(s=>s.id==='duplicate').title='Nova verzija';invalidate('seo-sitemap')
 assert.equal((await readTopSongs('domace'))[0].id,'duplicate')
})
test('an optional editorial failure shows the original list without caching away recovery',async()=>{
 reviewDown=true;assert.equal((await readTopSongs('domace'))[0].id,'duplicate');assert.equal((await readTopSongs('strane'))[0].id,'fragment')
 reviewDown=false;assert.equal((await readTopSongs('domace'))[0].id,'preferred');assert.equal((await readTopSongs('strane'))[0].id,'complete')
})
test('a real list failure propagates and a later request retries instead of caching an empty success',async()=>{
 listDown=true;await assert.rejects(readTopSongs('domace'),/list lookup unavailable/);listDown=false;assert.equal((await readTopSongs('domace'))[0].id,'preferred')
})
test('all three public routes preserve their own playlist return path and never replace stored song IDs',async()=>{
 const before=JSON.stringify(rows)
 for(const category of ['domace','narodne','strane']){const $=load(renderToStaticMarkup(await pages[category].default()));assert.equal($('h1').length,1);for(const a of $('a[href^="/pesme/"]').toArray()){const url=new URL($(a).attr('href'),'https://site.example');assert.equal(url.searchParams.get('playlist'),'/top-50/'+category);assert.ok(!url.pathname.endsWith('/duplicate'));assert.ok(!url.pathname.endsWith('/fragment'))}}
 assert.equal(JSON.stringify(rows),before)
})
