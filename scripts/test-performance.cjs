/* eslint-disable @typescript-eslint/no-require-imports -- Regression tests use isolated database and session fixtures. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert/strict"), Module = require("node:module"), path = require("node:path")
let session, users, playlist, rows, songs, revoked, down, reads
const readable = where => playlist && playlist.id === where.id && where.OR.some(rule => rule.isPublic === true && playlist.isPublic || rule.userId && rule.userId === playlist.userId)
const prisma = {
  user: { findUnique: async ({ where }) => { if (down) throw Error("postgres://secret"); return users.find(user => user.id === where.id) ?? null } },
  playlist: { findFirst: async args => {
    if (down) throw Error("secret"); if (!readable(args.where)) return null
    reads.push(args)
    assert.equal(args.select.songs.select.song.select.lyrics, undefined)
    return { id: playlist.id, name: playlist.name, songs: rows.slice().sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id)).slice(0,args.select.songs.take).map(row => ({songId:row.songId,song:songs.find(song=>song.id===row.songId)})) }
  } },
  playlistSong: { findFirst: async args => {
    if (revoked) return null
    assert.ok(args.where.playlist.OR)
    assert.equal(args.where.playlistId,"list")
    assert.equal(args.select.song.select.lyrics,true)
    const row = rows.find(row=>row.songId===args.where.songId)
    return row && readable(args.where.playlist) ? {song:songs.find(song=>song.id===row.songId)} : null
  } },
}
const original=Module._load
Module._load=function(request,parent,main){
  if(request==="next-auth")return{getServerSession:async()=>session}
  if(request==="@/lib/auth")return{authOptions:{}}
  if(request==="@/lib/prisma")return{prisma}
  if(request==="next/cache")return{revalidatePath(){}}
  if(request.startsWith("@/"))request=path.join(__dirname,"..",request.slice(2))
  return original.call(this,request,parent,main)
}
let route
try{route=require("../app/api/playlist/[id]/play/route.ts")}finally{Module._load=original}
const {isPerformanceSnapshot,performanceHref}=require("../lib/performance/model.ts")
const {loadPerformance}=require("../lib/performance/client.ts")
const nativeFetch=global.fetch
beforeEach(()=>{
  session={user:{id:"owner"}};users=[{id:"owner",banned:false},{id:"other",banned:false}]
  playlist={id:"list",name:"Moja lista",userId:"owner",isPublic:false}
  songs=["a","b","outside"].map(id=>({id,title:"Pesma "+id,lyrics:"G      D\nOriginalni stih "+id,artist:{name:"Bend"}}))
  rows=[{id:"row-a",songId:"a",order:1},{id:"row-b",songId:"b",order:0}]
  revoked=down=false;reads=[]
})
afterEach(()=>{global.fetch=nativeFetch})
const get=(songId,id="list")=>route.GET(new Request("https://site.test/api/playlist/"+id+"/play"+(songId?"?songId="+encodeURIComponent(songId):"")),{params:Promise.resolve({id})})
test("private playback is owner-only, including stale banned/deleted sessions",async()=>{
  for(const identity of [null,"other","missing"]){session=identity?{user:{id:identity}}:null;assert.equal((await get()).status,404)}
  session={user:{id:"owner"}};users[0].banned=true;assert.equal((await get()).status,404)
})
test("public playback is read-only and exports no owner IDs or unrelated lyrics",async()=>{
  playlist.isPublic=true;session=null
  const response=await get(),data=await response.json()
  assert.equal(response.status,200);assert.equal(data.current.id,"b");assert.equal(isPerformanceSnapshot(data),true)
  assert.deepEqual(data.songs.map(song=>song.id),["b","a"])
  assert.ok(data.current.lyrics.includes("stih b"));assert.doesNotMatch(JSON.stringify(data),/owner|outside/)
  assert.equal(data.songs[0].lyrics,undefined)
  assert.equal(response.headers.get("cache-control"),"private, no-store");assert.equal(response.headers.get("vary"),"Cookie")
})
test("selected song must belong to the readable playlist and canonical saved order is retained",async()=>{
  const data=await(await get("a")).json();assert.equal(data.current.id,"a");assert.deepEqual(data.songs.map(song=>song.id),["b","a"])
  assert.equal((await get("outside")).status,404)
  assert.equal(reads[0].select.songs.take,2001)
})
test("privacy revocation between metadata and lyrics reads returns no partial snapshot",async()=>{
  revoked=true;const response=await get();assert.equal(response.status,404);assert.equal((await response.json()).songs,undefined)
})
test("empty, oversized and invalid requests fail explicitly without truncation",async()=>{
  assert.equal((await get(undefined,"../escape")).status,400)
  rows=[];assert.equal((await get()).status,422)
  rows=Array.from({length:2001},(_,index)=>({id:"r"+index,songId:"a",order:index}));assert.equal((await get()).status,413)
  rows=[{id:"r",songId:"a",order:0}];songs[0].lyrics="x".repeat(100001);assert.equal((await get()).status,413)
})
test("null/tied positions are deterministic and database failures do not become empty success",async()=>{
  rows.forEach(row=>{row.order=null});const data=await(await get()).json();assert.deepEqual(data.songs.map(song=>song.id),["a","b"])
  down=true;const response=await get();assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/secret|postgres/)
})
test("client validates roster membership, response identity and failed/non-JSON responses",async()=>{
  const good=await(await get("a")).json()
  for(const data of [{...good,id:"wrong"},{...good,current:{...good.current,id:"outside"}},{...good,songs:[good.songs[0],good.songs[0]]}]){
    global.fetch=async()=>new Response(JSON.stringify(data));await assert.rejects(loadPerformance("list","a",new AbortController().signal))
  }
  global.fetch=async()=>new Response("<html>Error</html>",{status:500});await assert.rejects(loadPerformance("list",undefined,new AbortController().signal))
  global.fetch=async()=>new Response(JSON.stringify({error:"Denied"}),{status:404});await assert.rejects(loadPerformance("list",undefined,new AbortController().signal),cause=>cause.status===404)
  global.fetch=async(url,options)=>{assert.equal(url,"/api/playlist/list/play?songId=a");assert.equal(options.cache,"no-store");return new Response(JSON.stringify(good))}
  assert.equal((await loadPerformance("list","a",new AbortController().signal)).current.id,"a")
  assert.equal(performanceHref("list","a"),"/plejliste/list/sviranje?song=a")
})
