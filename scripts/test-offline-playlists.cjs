/* eslint-disable @typescript-eslint/no-require-imports -- Owner authorization and offline payload fixtures, without live database access. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const model=require('../lib/offline/model.ts')
let session,user,list,reads,fail
const original=Module._load
Module._load=function(request,parent,main){
 if(request==='next-auth')return{getServerSession:async()=>session}
 if(request==='@/lib/auth')return{authOptions:{}}
 if(request==='@/lib/prisma')return{prisma:{user:{findUnique:async()=>{if(fail)throw Error('postgres://secret');return user}},playlist:{findFirst:async args=>{reads++;assert.equal(args.where.userId,'owner');assert.equal(args.select.songs.take,101);assert.deepEqual(args.select.songs.orderBy,[{order:{sort:'asc',nulls:'last'}},{id:'asc'}]);return list?.userId===args.where.userId?list:null}}}}
 if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2))
 return original.call(this,request,parent,main)
}
let route
try{route=require('../app/api/playlist/[id]/offline/route.ts')}finally{Module._load=original}
const entry=i=>({setting:{userId:'owner',transpose:2,capo:3},song:{id:'song-'+i,title:'Pesma '+i,lyrics:'  G     D\nIzvorni stih\n\ne|---0---|\n',chords:null,artist:{name:'Izvođač'},performers:[]}})
beforeEach(()=>{session={user:{id:'owner'}};user={id:'owner',banned:false,role:'user'};list={id:'list',userId:'owner',name:'Moja lista',isPublic:false,songs:[entry(1),entry(2)]};reads=0;fail=false})
const get=()=>route.GET(new Request('https://site.test/api/playlist/list/offline'),{params:Promise.resolve({id:'list'})})
test('offline download rejects anonymous, banned and deleted users before reading content',async()=>{
 session=null;assert.equal((await get()).status,401)
 session={user:{id:'owner'}};for(const denied of [null,{...user,banned:true}]){user=denied;assert.equal((await get()).status,403)}assert.equal(reads,0)
})
test('public visibility does not allow offline export of another owner’s playlist',async()=>{
 list.userId='other';list.isPublic=true;const response=await get();assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/Izvorni stih|Moja lista/)
})
test('all success and failure responses are private, no-store and nonindexable',async()=>{
 for(const failure of [false,true]){fail=failure;const response=await get();assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie');assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');if(failure)assert.doesNotMatch(await response.text(),/postgres|secret/)}
})
test('snapshot preserves raw lyrics, tabs, sequence, user settings and duet credits',async()=>{
 list.songs[0].song.performers=[{artist:{name:'Prvi'}},{artist:{name:'Drugi'}}]
 list.songs[1].setting={userId:'other',transpose:9,capo:8}
 const response=await get(),body=await response.json();assert.equal(response.status,200);assert.ok(model.isOfflinePlaylist(body));assert.equal(body.songs[0].lyrics,entry(1).song.lyrics);assert.deepEqual(body.songs.map(s=>s.id),['song-1','song-2']);assert.equal(body.songs[0].artist,'Prvi & Drugi');assert.equal(body.songs[0].transpose,2);assert.equal(body.songs[0].capo,3);assert.equal(body.songs[1].transpose,0);assert.equal(body.songs[1].capo,null)
 assert.deepEqual(Object.keys(body).sort(),['version','id','ownerId','name','savedAt','signature','songs'].sort());assert.doesNotMatch(JSON.stringify(body),/isPublic|banned|email|password/)
})
test('empty, oversized and excessive-byte playlists fail without partial snapshots',async()=>{
 for(const count of [0,101]){list.songs=Array.from({length:count},(_,i)=>entry(i));assert.equal((await get()).status,422)}
 list.songs=Array.from({length:100},(_,i)=>({...entry(i),song:{...entry(i).song,lyrics:'x'.repeat(60000)}}));assert.equal((await get()).status,413)
})
test('client validator rejects corrupt schema, duplicated songs and altered settings signatures',async()=>{
 const body=await(await get()).json();for(const invalid of [null,{}, {...body,version:2},{...body,signature:'forged'},{...body,songs:[body.songs[0],body.songs[0]]},{...body,savedAt:'bad'},{...body,songs:[{...body.songs[0],transpose:99}]}])assert.equal(model.isOfflinePlaylist(invalid),false)
})
