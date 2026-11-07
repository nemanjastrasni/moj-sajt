/* eslint-disable @typescript-eslint/no-require-imports -- Server cache regression fixtures never connect to a live database. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),{gunzipSync}=require('node:zlib'),{AsyncLocalStorage}=require('node:async_hooks'),React=require('react')
const difficulty=require('../lib/music/difficulty.ts'),{catalogEntries,matchesCatalog}=require('../lib/playlists/catalog.ts')
const stored=new Map(),requestMemo=new Map(),definitions=[],payloads=[]
const scope=new AsyncLocalStorage()
let rows,queries,assessments,down,gate,nextFunction=0
const original=Module._load
Module._load=function(request,parent,main){
  if(request==='@/lib/prisma')return {prisma:{song:{findMany:async query=>{
    queries.push(query);if(down)throw Error('database unavailable')
    if(gate)await gate
    return rows.filter(row=>typeof query.where.category==='string'?row.category===query.where.category:query.where.category.in.includes(row.category))
  }}}}
  if(request==='react')return {...React,cache:fn=>{const id=nextFunction++;return(...args)=>{
    const memo=scope.getStore()??requestMemo,key=JSON.stringify([id,args]);if(!memo.has(key))memo.set(key,Promise.resolve().then(()=>fn(...args)));return memo.get(key)
  }}}
  if(request==='next/cache')return {unstable_cache:(fn,keys,options)=>{
    definitions.push({keys,options})
    return(...args)=>{
      const key=JSON.stringify([keys,args])
      if(stored.has(key))return Promise.resolve(stored.get(key).result)
      return Promise.resolve().then(()=>fn(...args)).then(result=>{payloads.push(result);stored.set(key,{result,tags:options.tags});return result})
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
beforeEach(()=>{stored.clear();requestMemo.clear();payloads.length=0;queries=[];assessments=0;down=false;gate=null;rows=[fixture('a'),fixture('b','E(#9) A7'),fixture('c','C D','narodne'),fixture('d','Samo tekst','strane')]})

test('different pages and filters reuse assessments while categories stay separate',async()=>{
  await request('4-akorda',null,1)
  const firstAssessments=assessments
  await request('4-akorda',null,2)
  await request('beginner',null,1)
  await request('acoustic',null,1)
  assert.equal(queries.length,1);assert.equal(assessments,firstAssessments)
  const folk=await request('narodne','narodne',1)
  assert.deepEqual(folk.songs.map(song=>song.id),['c']);assert.equal(queries.length,2)
  assert.deepEqual(queries[0].orderBy,[{popularity:'desc'},{title:'asc'},{id:'asc'}])
})

test('cached index and page responses contain only public metadata, never source text or accounts',async()=>{
  const page=await request('4-akorda',null,1)
  assert.equal(payloads.length,1)
  const decoded=gunzipSync(Buffer.from(payloads[0],'base64')).toString('utf8'),cards=JSON.parse(decoded)
  assert.doesNotMatch(decoded,/LYRIC_BODY|CHORD_BODY|SECRET|lyrics|chords|email|userId|transpose/)
  assert.deepEqual(Object.keys(cards[0]).sort(),['artist','catalogs','category','id','level','slug','title'])
  assert.deepEqual(Object.keys(page.songs[0]).sort(),['artist','category','id','level','slug','title'])
  assert.deepEqual(page.songs[0].artist,{name:'Bend',slug:'bend'})
  const definition=definitions[0]
  assert.equal(definition.options.revalidate,60)
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
  assert.ok(!queries[0].select.userId)
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
  assert.equal(queries.length,2)
})
