/* eslint-disable @typescript-eslint/no-require-imports -- Server cache regression fixtures never connect to a live database. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),{gunzipSync}=require('node:zlib'),{AsyncLocalStorage}=require('node:async_hooks'),React=require('react')
const difficulty=require('../lib/music/difficulty.ts'),{catalogEntries,matchesCatalog}=require('../lib/playlists/catalog.ts')
const stored=new Map(),requestMemo=new Map(),definitions=[],payloads=[]
const scope=new AsyncLocalStorage()
let rows,queries,assessments,decodes,down,gate,now,nextFunction=0,sourceQueries=[]
const original=Module._load
Module._load=function(request,parent,main){
  if(request==='node:zlib'){const zlib=original.call(this,request,parent,main);return {...zlib,gunzip:(...args)=>{decodes++;return zlib.gunzip(...args)}}}
  if(request==='@/lib/prisma'){const tx={
    $queryRaw:async query=>{queries.push(query);if(down)throw Error('database unavailable');if(gate)await gate;return rows.filter(row=>['domace','narodne','strane'].includes(row.category)).map(({lyrics,chords,...row})=>({...row,sourceHash:row.sourceHash??'changed-source'}))},
    song:{findMany:async query=>{sourceQueries.push(query);return rows.filter(row=>query.where.id.in.includes(row.id)).map(({id,lyrics,chords})=>({id,lyrics,chords}))}}};return{prisma:{...tx,$transaction:async(work,options)=>{assert.equal(options.isolationLevel,'RepeatableRead');return work(tx)}}}}
  if(request==='react')return {...React,cache:fn=>{const id=nextFunction++;return(...args)=>{
    const memo=scope.getStore()??requestMemo,key=JSON.stringify([id,args]);if(!memo.has(key))memo.set(key,Promise.resolve().then(()=>fn(...args)));return memo.get(key)
  }}}
  if(request==='next/cache')return {unstable_cache:(fn,keys,options)=>{
    definitions.push({keys,options})
    return(...args)=>{
      const key=JSON.stringify([keys,args])
      if(stored.has(key)&&stored.get(key).expires>now)return Promise.resolve(stored.get(key).result)
      return Promise.resolve().then(()=>fn(...args)).then(result=>{payloads.push(result);stored.set(key,{result,tags:options.tags,expires:now+options.revalidate*1000});return result})
    }
  }}
  if(request==='../music/difficulty')return {...difficulty,estimateDifficulty:song=>{assessments++;return difficulty.estimateDifficulty(song)}}
  if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2))
  return original.call(this,request,parent,main)
}
let catalogPage
try{({catalogPage}=require('../lib/playlists/catalog-server.ts'))}finally{Module._load=original}
const fixture=(id,lyrics='C G Am',category='domace')=>({id,title:'Pesma '+id,slug:id,category,lyrics:lyrics+'\nLYRIC_BODY_NOT_IN_CACHE',chords:'CHORD_BODY_NOT_IN_CACHE',artist:{name:'Bend',slug:'bend',email:'SECRET'},userId:'SECRET',transpose:5})
const request=(...args)=>scope.run(new Map(),()=>catalogPage(...args))
beforeEach(()=>{stored.clear();requestMemo.clear();payloads.length=0;queries=[];sourceQueries=[];assessments=decodes=now=0;down=false;gate=null;rows=[fixture('a'),fixture('b','E(#9) A7'),fixture('c','C D','narodne'),fixture('d','Samo tekst','strane')]})

test('different pages and filters reuse assessments while categories stay separate',async()=>{
  await request('4-akorda',null,1)
  const firstAssessments=assessments
  await request('4-akorda',null,2)
  await request('beginner',null,1)
  await request('acoustic',null,1)
  assert.equal(queries.length,1);assert.equal(assessments,firstAssessments)
  const folk=await request('narodne','narodne',1)
  assert.deepEqual(folk.songs.map(song=>song.id),['c']);assert.equal(queries.length,1);assert.equal(assessments,firstAssessments)
  assert.match(queries[0].text,/ORDER BY s\.popularity DESC,s\.title ASC,s\.id ASC/)
})

test('cached index and page responses contain only public metadata, never source text or accounts',async()=>{
  const page=await request('4-akorda',null,1)
  assert.equal(payloads.length,2)
  const decoded=gunzipSync(Buffer.from(payloads.find(row=>row.encoded).encoded,'base64')).toString('utf8'),cards=JSON.parse(decoded)
  assert.doesNotMatch(decoded,/LYRIC_BODY|CHORD_BODY|SECRET|lyrics|chords|email|userId|transpose/)
  assert.deepEqual(Object.keys(cards[0]).sort(),['artist','catalogs','category','id','level','slug','title'])
  assert.deepEqual(Object.keys(page.songs[0]).sort(),['artist','category','id','level','slug','title'])
  assert.deepEqual(page.songs[0].artist,{name:'Bend',slug:'bend'})
  const definition=definitions[0]
  assert.equal(definition.options.revalidate,1800)
  assert.ok(definition.options.tags.includes('playlist-catalog'))
})

test('metadata and rendered page share the same decoded request snapshot',async()=>{
  const [first,second]=await Promise.all([catalogPage('4-akorda',null,1),catalogPage('4-akorda',null,1)])
  assert.equal(first,second);assert.equal(queries.length,1)
  await catalogPage('beginner',null,1)
  assert.equal(queries.length,1);assert.equal(assessments,rows.length)
})

test('skill changes use the current level without caching user accounts or reprocessing music',async()=>{
  const beginner=await request('skill',null,1,1),advanced=await request('skill',null,1,4)
  assert.ok(!beginner.songs.some(song=>song.id==='b'))
  assert.ok(advanced.songs.some(song=>song.id==='b'))
  assert.equal(queries.length,1)
  assert.doesNotMatch(queries[0].text,/userId|email|transpose/)
})

test('concurrent cold requests share one database read and assessment build',async()=>{
  let release
  gate=new Promise(resolve=>{release=resolve})
  const first=request('4-akorda',null,1),second=request('beginner',null,1)
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(queries.length,1)
  release()
  await Promise.all([first,second])
  assert.equal(assessments,rows.length)
})

test('database errors are retried and admin tag invalidation expires the shared assessments',async()=>{
  down=true;await assert.rejects(request('4-akorda',null,1),/database unavailable/)
  down=false;assert.ok((await request('veoma-lako',null,1)).songs.some(song=>song.id==='a'))
  rows[0]=fixture('a','E(#9) A7')
  for(const [key,entry]of stored)if(entry.tags.includes('playlist-catalog'))stored.delete(key)
  assert.ok(!(await request('veoma-lako',null,1)).songs.some(song=>song.id==='a'))
  assert.equal(queries.length,3)
})

test('all existing public filters preserve legacy selection, ordering, pagination and difficulty',async()=>{
  rows=Array.from({length:165},(_,i)=>fixture(String(i),['C G Am','F#m Bm E','E(#9) A7','Samo tekst','G D C A E'][i%5],['domace','narodne','strane'][i%3]))
  for(const entry of catalogEntries)for(const category of [null,'domace'])for(const number of [1,2,999]){
    const selected=rows.filter(song=>!category||song.category===category).map(song=>({song,assessment:difficulty.estimateDifficulty(song)})).filter(({song,assessment})=>matchesCatalog(song,entry.slug,assessment))
    const pages=Math.max(1,Math.ceil(selected.length/50)),current=Math.min(pages,Math.max(1,number))
    const songs=selected.slice((current-1)*50,current*50).map(({song,assessment})=>({id:song.id,title:song.title,slug:song.slug,category:song.category,artist:{name:song.artist.name,slug:song.artist.slug},level:assessment.level}))
    assert.deepEqual(await request(entry.slug,category,number),{total:selected.length,pages,current,songs})
  }
  assert.equal(queries.length,1)
})

test('warm pages skip decompression, while excessive page numbers share the actual last-page cache entry',async()=>{
  rows=Array.from({length:125},(_,i)=>fixture(String(i)))
  const first=await request('4-akorda',null,999);assert.equal(first.current,3);assert.equal(decodes,1)
  for(const page of [1000,999999,1e9,3])assert.deepEqual(await request('4-akorda',null,page),first)
  assert.equal(decodes,1);assert.equal(queries.length,1)
  await request('4-akorda',null,1);assert.equal(decodes,2)
})

test('TTL refresh and administrative invalidation observe changed cards, totals and source revisions',async()=>{
  const first=await request('4-akorda',null,1);rows[0].title='Updated title'
  now=1799999;assert.deepEqual(await request('4-akorda',null,1),first);assert.equal(queries.length,1);assert.equal(decodes,1)
  now=1800000;assert.equal((await request('4-akorda',null,1)).songs[0].title,'Updated title');assert.equal(queries.length,2);assert.equal(decodes,2)
  rows.push(fixture('new'));for(const [key,entry]of stored)if(entry.tags.includes('playlist-catalog'))stored.delete(key)
  assert.equal((await request('4-akorda',null,1)).total,first.total+1);assert.equal(queries.length,3)
})

test('unknown filters and invalid skill values do not create shared cache entries or issue database reads',async()=>{
  for(const args of [['private-user-id',null,1],['4-akorda','private',1],['skill',null,1,99]])assert.equal((await request(...args)).total,0)
  assert.equal(queries.length,0);assert.equal(payloads.length,0)
})


test('matching public fingerprints avoid source text reads and assessment; changed sources are recalculated',async()=>{
 const snapshot=require('../lib/playlists/catalog-assessments.json'),[id,saved]=Object.entries(snapshot.songs)[0]
 rows=[{...fixture(id),sourceHash:saved[0]}]
 const expected=saved[1],level=await request('domace',null,1)
 assert.equal(level.songs[0].level,expected);assert.equal(sourceQueries.length,0);assert.equal(assessments,0)
 rows[0]={...fixture(id,'E(#9) A7'),sourceHash:'changed'};for(const[key,entry]of stored)if(entry.tags.includes('playlist-catalog'))stored.delete(key)
 assert.equal((await request('veoma-tesko',null,1)).songs[0].id,id);assert.equal(sourceQueries.length,1);assert.equal(assessments,1)
 rows=[];for(const[key,entry]of stored)if(entry.tags.includes('playlist-catalog'))stored.delete(key)
 assert.equal((await request('domace',null,1)).total,0)
})
