/* eslint-disable @typescript-eslint/no-require-imports -- Versioned editorial decisions tested with synthetic content and a read-only database fixture. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),{createHash}=require('node:crypto')
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio')
const root=path.resolve(__dirname,'..'),original=Module._load,cacheStore=new Map()
const make=(id,lyrics,slug=id)=>({id,title:'Probna pesma',slug,lyrics,chords:null,artist:{id:'artist',slug:'artist',category:'domace',name:'Probni izvodjac'},performers:[]})
const initial=[make('fragment','Am\nKratak probni pocetak...'),make('complete','Am C G\nProbni ceo zapis za ovu sintetičku proveru.'),make('duplicate','C G\nProbni zajednicki zapis.'),make('preferred','C G\nProbni zajednicki zapis.'),make('ordinary','Am')]
const hash=song=>createHash('sha256').update(JSON.stringify([song.lyrics,song.chords])).digest('hex')
const snapshot=id=>{const s=initial.find(song=>song.id===id);return{id:s.id,title:s.title,slug:s.slug,artistId:s.artist.id,artistSlug:s.artist.slug,category:s.artist.category,fingerprint:hash(s)}}
const rules=[{kind:'incomplete',source:snapshot('fragment'),target:snapshot('complete')},{kind:'duplicate',source:snapshot('duplicate'),target:snapshot('preferred')}]
let rows,calls,down
const prisma={song:{
 findFirst:async query=>{calls.push(['first',query]);if(down)throw Error('private-db-secret');return rows.find(song=>song.id===query.where.id)||null},
 findMany:async query=>{calls.push(['many',query]);if(down)throw Error('private-db-secret');let list=rows;if(query.where?.id?.in)list=list.filter(song=>query.where.id.in.includes(song.id));if(query.where?.id?.notIn)list=list.filter(song=>!query.where.id.notIn.includes(song.id));return list.slice(query.skip||0,query.take===undefined?undefined:(query.skip||0)+query.take)},
 count:async query=>{calls.push(['count',query]);if(down)throw Error('private-db-secret');return rows.filter(song=>!query.where?.id?.notIn?.includes(song.id)).length},
 update:()=>{throw Error('No database writes permitted')},delete:()=>{throw Error('No database writes permitted')}
},artist:{count:async()=>0,findMany:async()=>[]}}
Module._load=function(request,parent,main){
 if(request==='./song-search-review-rules.json')return rules
 if(request==='@/lib/prisma')return{prisma}
 if(request==='react')return{...React,cache:fn=>fn}
 if(request==='next/cache')return{unstable_cache:(fn,keys)=>async(...args)=>{const key=JSON.stringify([keys,args]);if(!cacheStore.has(key))cacheStore.set(key,fn(...args).catch(error=>{cacheStore.delete(key);throw error}));return cacheStore.get(key)}}
 if(request==='next/link')return{__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)}
 if(request==='next/navigation')return{notFound:()=>{throw Error('not found')},redirect:()=>{throw Error('Unexpected redirect')}}
 if(request==='next/headers')return{headers:async()=>new Headers()}
 if(request==='@/lib/publicPages')return{getPublicSong:async(category,artist,slug)=>rows.find(song=>song.slug===slug)||null}
 if(request==='@/lib/songViews')return{countSongViewAfterResponse:()=>{}}
 if(request==='@/lib/songReview/server')return{songReviewVersion:()=> 'fixture-version'}
 if(request==='@/lib/playlists/server')return{playlistViewerId:async()=>null}
 if(request==='@/lib/playlists/omiljene')return{omiljeneId:async()=>null}
 if(request.endsWith('.css'))return{__esModule:true,default:{}}
 if(request==='@/app/components/UiText')return{__esModule:true,default:({text})=>text}
 if(request.endsWith('/components/SongClient'))return{__esModule:true,default:props=>React.createElement('div',{'data-song-id':props.song.id,'data-playlist-id':props.playlistId},props.song.lyrics)}
 if(request.includes('/components/'))return{__esModule:true,default:()=>null,BackNavigationTarget:()=>null}
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
let policy,server,maps,page
try{policy=require('../lib/seo/song-search-review.ts');server=require('../lib/seo/song-search-review-server.ts');maps=require('../lib/seo/sitemaps.ts');page=require('../app/pesme/[category]/[artist]/[slug]/page.tsx')}finally{Module._load=original}
const props=slug=>({params:Promise.resolve({category:'domace',artist:'artist',slug}),searchParams:Promise.resolve({playlist:'/plejliste/user-list'})})
beforeEach(()=>{rows=structuredClone(initial);calls=[];down=false;cacheStore.clear()})

test('ordinary short songs are not classified by length and do not add a target query',async()=>{
 const ordinary=rows.find(song=>song.id==='ordinary')
 assert.equal(policy.songReviewRule(ordinary),null)
 assert.equal(await server.getSongSearchReview(ordinary),null)
 assert.deepEqual(calls,[])
 assert.equal((await page.generateMetadata(props('ordinary'))).robots,undefined)
})
test('a confirmed fragment has a visible alternative, truthful metadata and noindex while retaining its song ID',async()=>{
 const metadata=await page.generateMetadata(props('fragment'))
 assert.deepEqual(metadata.robots,{index:false,follow:true})
 assert.match(metadata.title,/početni fragment/)
 assert.equal(new URL(metadata.alternates.canonical).pathname,'/pesme/domace/artist/fragment')
 const $=load(renderToStaticMarkup(await page.default(props('fragment'))))
 assert.ok($('aside').text().includes('početni fragment'))
 assert.equal($('aside a').attr('href'),'/pesme/domace/artist/complete')
 assert.equal($('[data-song-id]').attr('data-song-id'),'fragment')
 assert.equal($('[data-playlist-id]').attr('data-playlist-id'),'user-list')
})
test('editing a fragment automatically removes the version-bound notice and noindex',async()=>{
 rows.find(song=>song.id==='fragment').lyrics+='\nDodatni uredjeni zapis.'
 assert.equal((await page.generateMetadata(props('fragment'))).robots,undefined)
 assert.equal(load(renderToStaticMarkup(await page.default(props('fragment'))))('aside').length,0)
 assert.equal(calls.length,0)
})
test('missing or edited alternatives never leave a broken recommendation and do not fail the fragment',async()=>{
 rows=rows.filter(song=>song.id!=='complete')
 let $=load(renderToStaticMarkup(await page.default(props('fragment'))))
 assert.equal($('aside a').length,0);assert.equal($('aside').length,1)
 down=true
 $=load(renderToStaticMarkup(await page.default(props('fragment'))))
 assert.equal($('aside a').length,0)
 assert.deepEqual((await page.generateMetadata(props('fragment'))).robots,{index:false,follow:true})
})
test('duplicate canonical chooses the identical preferred record without redirecting or changing playlist context',async()=>{
 const metadata=await page.generateMetadata(props('duplicate'))
 assert.equal(new URL(metadata.alternates.canonical).pathname,'/pesme/domace/artist/preferred')
 assert.equal(metadata.openGraph.url,metadata.alternates.canonical)
 assert.equal(metadata.robots,undefined)
 const $=load(renderToStaticMarkup(await page.default(props('duplicate'))))
 assert.equal($('[data-song-id]').attr('data-song-id'),'duplicate')
 assert.equal($('[data-playlist-id]').attr('data-playlist-id'),'user-list')
})
test('changing either duplicate version, its identity or its artist restores the own canonical',async()=>{
 for(const mutate of [s=>{s.lyrics+='\nDruga verzija'},s=>{s.chords='Am'},s=>{s.title='Drugi naslov'},s=>{s.artist.id='different-artist'},s=>{s.slug='different-slug'}]){
  for(const id of ['duplicate','preferred']){
   rows=structuredClone(initial);mutate(rows.find(song=>song.id===id))
   const song=rows.find(song=>song.id==='duplicate')
   assert.equal(await server.getSongSearchReview(song),null)
  }
 }
})
test('optional canonical-target failure falls back to the current readable page',async()=>{
 down=true
 const metadata=await page.generateMetadata(props('duplicate'))
 assert.equal(new URL(metadata.alternates.canonical).pathname,'/pesme/domace/artist/duplicate')
 assert.equal(metadata.robots,undefined)
})
test('sitemap counts and batches use the same version-checked exclusions without exposing private data',async()=>{
 const xml=await maps.sitemapPage('songs-0.xml')
 assert.match(xml,/\/complete<\/loc>/);assert.match(xml,/\/preferred<\/loc>/);assert.match(xml,/\/ordinary<\/loc>/)
 assert.doesNotMatch(xml,/\/fragment<\/loc>|\/duplicate<\/loc>|fingerprint|lyrics|user-list/)
 const filter=calls.find(([kind])=>kind==='count')[1].where.id.notIn
 assert.deepEqual([...filter].sort(),['duplicate','fragment'])
 const pageQuery=calls.find(([kind,query])=>kind==='many'&&query.take===1000)[1]
 assert.deepEqual(pageQuery.where.id.notIn,filter)
 assert.equal(calls.filter(([kind,query])=>kind==='many'&&query.where.id?.in).length,1)
 assert.equal(pageQuery.select.lyrics,undefined)
})
test('sitemap decisions are reconsidered after a corrected source or changed canonical target',async()=>{
 rows.find(song=>song.id==='fragment').lyrics+='\nDovrsen zapis.'
 rows.find(song=>song.id==='preferred').lyrics+='\nDrugacija verzija.'
 const xml=await maps.sitemapPage('songs-0.xml')
 assert.match(xml,/\/fragment<\/loc>/);assert.match(xml,/\/duplicate<\/loc>/)
})
