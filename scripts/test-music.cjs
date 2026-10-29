/* eslint-disable @typescript-eslint/no-require-imports -- Isolated music API and player model fixtures. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const model=require('../lib/music/model.ts')
let state,session,fail,failItem,revoked,seenQueries
function match(row,where={}){
  if(where.id&&row.id!==where.id)return false
  if(where.userId&&row.userId!==where.userId)return false
  if(where.playlistId&&row.playlistId!==where.playlistId)return false
  if(where.isPublic!==undefined&&row.isPublic!==where.isPublic)return false
  if(where.category&&row.category!==where.category)return false
  if(where.OR&&!where.OR.some(clause=>match(row,clause)))return false
  return true
}
function materialize(row){return row?{...structuredClone(row),items:state.items.filter(item=>item.playlistId===row.id).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(item=>structuredClone(item))}:null}
const prisma={
  user:{findUnique:async({where})=>{if(fail)throw Error('private-database-credentials');return structuredClone(state.users.find(user=>user.id===where.id)||null)}},
  listeningPlaylist:{
    findFirst:async({where,select})=>{seenQueries.push({where,select});return materialize(state.lists.find(row=>match(row,where)))},
    findMany:async(query)=>{seenQueries.push(query);return state.lists.filter(row=>match(row,query.where)).map(row=>({...row,user:{name:'Public display name'},likes:state.likes.filter(like=>like.playlistId===row.id&&like.userId===query.select.likes.where.userId).slice(0,1),_count:{items:state.items.filter(item=>item.playlistId===row.id).length,likes:state.likes.filter(like=>like.playlistId===row.id).length}})).slice(query.skip||0,(query.skip||0)+query.take)},
    count:async({where})=>state.lists.filter(row=>match(row,where)).length,
    create:async({data})=>{const row={id:'created',views:0,...data};state.lists.push(row);return materialize(row)},
    update:async({where,data})=>Object.assign(state.lists.find(row=>row.id===where.id),data),
    delete:async({where})=>{state.lists=state.lists.filter(row=>row.id!==where.id)},
  },
  listeningItem:{
    findUnique:async({where})=>structuredClone(state.items.find(item=>item.id===where.id)||null),
    create:async({data})=>{state.items.push({id:'new-item',...data})},
    update:async({where,data})=>{if(failItem===where.id)throw Error('write failed');Object.assign(state.items.find(item=>item.id===where.id),data)},
    delete:async({where})=>{state.items=state.items.filter(item=>item.id!==where.id)},
    deleteMany:async({where})=>{state.items=state.items.filter(item=>!match(item,where))},
  },
  listeningPlaylistLike:{
    findUnique:async({where})=>state.likes.find(like=>match(like,where.userId_playlistId))||null,
    create:async({data})=>{state.likes.push({id:'new-like',...data})},
    delete:async({where})=>{state.likes=state.likes.filter(like=>!match(like,where.userId_playlistId))},
    deleteMany:async({where})=>{state.likes=state.likes.filter(like=>!match(like,where))},
  },
  $transaction:async(work)=>{const before=structuredClone(state);if(revoked)state.users[0].banned=true;try{return await work(prisma)}catch(error){state=before;throw error}},
}
const original=Module._load
Module._load=function(request,parent,isMain){
  if(request==='@/lib/prisma')return {prisma}
  if(request==='@/lib/auth')return {authOptions:{}}
  if(request==='next-auth')return {getServerSession:async()=>session}
  if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2))
  return original.call(this,request,parent,isMain)
}
let server,root,detail,item,itemDetail,reorder,legacyOrder,rename,legacyAdd,likes
try{
  server=require('../lib/music/server.ts');root=require('../app/api/listening-playlist/route.ts');detail=require('../app/api/listening-playlist/[id]/route.ts');item=require('../app/api/listening-playlist/item/route.ts');itemDetail=require('../app/api/listening-playlist/item/[id]/route.ts');reorder=require('../app/api/listening-playlist/reorder/route.ts');legacyOrder=require('../app/api/listening-playlist/item/reorder-all/route.ts');rename=require('../app/api/listening-playlist/[id]/rename/route.ts');legacyAdd=require('../app/listening-playlist/item/route.ts');likes=require('../app/api/listening-playlist-like/route.ts')
}finally{Module._load=original}
const req=(body={},method='POST',headers={})=>new Request('https://site.test/api/music',{method,headers:{'content-type':'application/json',origin:'https://site.test',...headers},...(method==='GET'?{}:{body:JSON.stringify(body)})})
const ctx=(id='mine')=>({params:Promise.resolve({id})})
const version=(id='mine')=>server.musicVersion(materialize(state.lists.find(row=>row.id===id)))
const edit=()=>({version:version(),name:'Renamed',category:'Mix',isPublic:false})
beforeEach(()=>{
  state={users:[{id:'owner',banned:false,role:'user',password:'hash-secret'},{id:'other',banned:false,role:'user'}],lists:[{id:'mine',userId:'owner',name:'Private',category:'Mix',isPublic:false,views:0},{id:'foreign',userId:'other',name:'Other private',category:'Mix',isPublic:false,views:5},{id:'public',userId:'other',name:'Public',category:'Strane',isPublic:true,views:10},{id:'legacy',userId:null,name:'Old public',category:'Mix',isPublic:true,views:1}],items:[{id:'a',playlistId:'mine',title:'First',type:'youtube',url:'https://youtu.be/abcdefghijk',order:0},{id:'b',playlistId:'mine',title:'Second',type:'youtube',url:'https://www.youtube.com/watch?v=lmnopqrstuv',order:1},{id:'c',playlistId:'foreign',title:'Private foreign item',type:'youtube',url:'https://youtu.be/12345678901',order:0}],likes:[],songs:[{id:'song',lyrics:'Original chords'}],favorites:[{id:'favorite'}],chordPlaylists:[{id:'chord-list'}]}
  session={user:{id:'owner',role:'user'}};fail=false;failItem=null;revoked=false;seenQueries=[]
})
test('YouTube parser accepts exact HTTPS hosts, videos, shorts, live and explicit full playlists',()=>{
  for(const url of ['https://youtu.be/abcdefghijk?t=42','https://www.youtube.com/watch?v=abcdefghijk&list=PL1234567890','https://m.youtube.com/shorts/abcdefghijk','https://www.youtube.com/embed/abcdefghijk','https://www.youtube.com/live/abcdefghijk','https://music.youtube.com/watch?v=abcdefghijk'])assert.deepEqual(model.youtubeSource(url),{kind:'video',id:'abcdefghijk'})
  assert.deepEqual(model.youtubeSource('https://www.youtube.com/playlist?list=PL1234567890'),{kind:'playlist',id:'PL1234567890'})
  assert.equal(model.canonicalYoutube({kind:'video',id:'abcdefghijk'}),'https://www.youtube.com/watch?v=abcdefghijk')
})
test('host spoofing, credentials, ports, scripts and malformed identifiers never become embeds',()=>{
  for(const url of ['http://youtu.be/abcdefghijk','javascript:alert(1)','https://youtube.com.evil.test/watch?v=abcdefghijk','https://evil.test/?youtube.com/watch?v=abcdefghijk','https://www.youtube.com@evil.test/watch?v=abcdefghijk','https://user:pass@www.youtube.com/watch?v=abcdefghijk','https://youtu.be:444/abcdefghijk','https://youtu.be/a','https://youtu.be/abcdefghijk/more','https://www.youtube.com/watch?v=abcdefghijk&v=lmnopqrstuv','https://www.youtube.com/playlist?list=bad','https://www.youtube.com/embed/%22onload%3Dalert(1)',null,{}])assert.equal(model.youtubeSource(url),null,String(url))
  assert.equal(model.externalMusicUrl('https://evil.test/?soundcloud.com'),null)
  assert.ok(model.externalMusicUrl('https://artist.bandcamp.com/album/name'))
})
test('next selection stops at the end and shuffle never repeats the current video',()=>{
  assert.equal(model.nextMusicIndex(2,3,false),null);assert.equal(model.nextMusicIndex(0,1,true),null)
  for(let index=0;index<5;index++)for(const random of [0,.1,.9,1])assert.notEqual(model.nextMusicIndex(index,5,true,()=>random),index)
})
test('private reads are owner-only and DTOs never include account or storage ownership fields',async()=>{
  const own=await detail.GET(req({},'GET'),ctx());assert.equal(own.status,200)
  const data=await own.json();assert.equal(data.playlist.editable,true)
  assert.doesNotMatch(JSON.stringify(data),/password|userId|playlistId|hash-secret/)
  assert.equal((await detail.GET(req({},'GET'),ctx('foreign'))).status,404)
  session=null
  assert.equal((await detail.GET(req({},'GET'),ctx())).status,404)
  const publicRead=await detail.GET(req({},'GET'),ctx('public'));assert.equal(publicRead.status,200);assert.equal((await publicRead.json()).playlist.editable,false)
})
test('personal catalog filters by the current active account; public and legacy catalogs are read-only',async()=>{
  const mine=await root.GET(new Request('https://site.test/api/listening-playlist'));assert.equal(mine.status,200);assert.deepEqual((await mine.json()).lists.map(list=>list.id),['mine'])
  assert.deepEqual(seenQueries.at(-1).where,{userId:'owner'})
  session=null
  assert.equal((await root.GET(new Request('https://site.test/api/listening-playlist'))).status,401)
  const publicRead=await root.GET(new Request('https://site.test/api/listening-playlist?scope=public'));assert.deepEqual((await publicRead.json()).lists.map(list=>list.id),['public','legacy'])
  assert.equal(seenQueries.at(-1).where.isPublic,true)
})
test('anonymous, banned and missing users cannot write through current or legacy endpoints',async()=>{
  const actions=[()=>root.POST(req({name:'List',category:'Mix'})),()=>detail.PATCH(req(edit(),'PATCH'),ctx()),()=>detail.DELETE(req({version:version()},'DELETE'),ctx()),()=>item.POST(req({playlistId:'mine',url:'https://youtu.be/12345678901',version:version()})),()=>itemDetail.DELETE(req({version:version()},'DELETE'),ctx('a')),()=>itemDetail.POST(req({version:version()}),ctx('a')),()=>item.DELETE(req({itemId:'a',version:version()},'DELETE')),()=>reorder.PUT(req({playlistId:'mine',items:['b','a'],version:version()},'PUT')),()=>legacyOrder.POST(req({playlistId:'mine',items:['b','a'],version:version()})),()=>rename.POST(req(edit()),ctx()),()=>legacyAdd.POST(req({playlistId:'mine',url:'https://youtu.be/12345678901',version:version()})),()=>likes.POST(req({playlistId:'public'}))]
  for(const identity of [null,'missing','owner']){
    session=identity?{user:{id:identity,role:'admin'}}:null;state.users[0].banned=identity==='owner'
    for(const action of actions){const before=structuredClone(state);assert.ok([401,403].includes((await action()).status));assert.deepEqual(state,before)}
  }
})
test('another user and a forged admin session cannot mutate a private or public foreign list',async()=>{
  session={user:{id:'owner',role:'admin'}}
  for(const id of ['foreign','public','legacy']){
    const before=structuredClone(state)
    for(const operation of ['edit','delete','add','reorder','remove'])await assert.rejects(server.mutateMusic(id,{...edit(),version:version(id),url:'https://youtu.be/12345678901',items:[],itemId:'c'},operation,'c'),error=>error.status===404)
    assert.deepEqual(state,before)
  }
  assert.equal((await itemDetail.DELETE(req({version:version('foreign')},'DELETE'),ctx('c'))).status,404)
})
test('new lists belong to the authenticated user and default to private, regardless of injected ownership',async()=>{
  const response=await root.POST(req({name:'  New list  ',category:'Mix',userId:'other',role:'admin'}));assert.equal(response.status,201)
  assert.deepEqual(state.lists.at(-1),{id:'created',views:0,name:'New list',category:'Mix',isPublic:false,userId:'owner'})
  assert.equal((await response.json()).playlist.editable,true)
})
test('owner can rename and publish; stale writes and unsafe bodies fail without changes',async()=>{
  const stale=version();assert.equal((await detail.PATCH(req({...edit(),isPublic:true},'PATCH'),ctx())).status,200)
  assert.equal(state.lists[0].isPublic,true)
  const before=structuredClone(state)
  assert.equal((await detail.PATCH(req({...edit(),version:stale},'PATCH'),ctx())).status,409)
  assert.equal((await detail.PATCH(req(edit(),'PATCH',{origin:'https://evil.test'}),ctx())).status,403)
  assert.equal((await detail.PATCH(req(edit(),'PATCH',{'sec-fetch-site':'cross-site'}),ctx())).status,403)
  assert.equal((await detail.PATCH(req(edit(),'PATCH',{'content-type':'text/plain'}),ctx())).status,415)
  assert.deepEqual(state,before)
})
test('adding links preserves order, rejects duplicate/spoofed sources and retains existing items',async()=>{
  assert.equal((await item.POST(req({playlistId:'mine',version:version(),url:'https://www.youtube.com/shorts/12345678901',title:'Third'}))).status,201)
  assert.equal(state.items.at(-1).order,2);assert.equal(state.items.at(-1).url,'https://www.youtube.com/watch?v=12345678901')
  const before=structuredClone(state)
  assert.equal((await item.POST(req({playlistId:'mine',version:version(),url:'https://youtu.be/12345678901'}))).status,409)
  assert.equal((await item.POST(req({playlistId:'mine',version:version(),url:'https://evil.test/youtube.com/watch?v=12345678901'}))).status,400)
  assert.deepEqual(state,before)
})
test('reorder is an exact permutation of this list; foreign, duplicate and incomplete IDs fail',async()=>{
  for(const ids of [['a','c'],['a','a'],['a']]){
    const before=structuredClone(state)
    assert.equal((await reorder.PUT(req({playlistId:'mine',version:version(),items:ids},'PUT'))).status,400);assert.deepEqual(state,before)
  }
  assert.equal((await reorder.PUT(req({playlistId:'mine',version:version(),items:['b','a']},'PUT'))).status,200)
  assert.equal(state.items.find(item=>item.id==='b').order,0)
})
test('partial reorder failure rolls back earlier writes and revoked accounts are rechecked in the transaction',async()=>{
  let before=structuredClone(state);failItem='a'
  assert.equal((await reorder.PUT(req({playlistId:'mine',version:version(),items:['b','a']},'PUT'))).status,503);assert.deepEqual(state,before)
  failItem=null;before=structuredClone(state);revoked=true
  assert.equal((await detail.PATCH(req(edit(),'PATCH'),ctx())).status,403);assert.deepEqual(state,before)
})
test('deleting an item or a whole music list leaves chord songs, favourites and other lists unchanged',async()=>{
  const unrelated=structuredClone({songs:state.songs,favorites:state.favorites,chordPlaylists:state.chordPlaylists})
  assert.equal((await itemDetail.DELETE(req({version:version()},'DELETE'),ctx('a'))).status,200)
  state.likes.push({id:'like',userId:'other',playlistId:'mine'})
  assert.equal((await detail.DELETE(req({version:version()},'DELETE'),ctx())).status,200)
  assert.equal(state.lists.some(list=>list.id==='mine'),false);assert.equal(state.items.some(item=>item.playlistId==='mine'),false);assert.equal(state.likes.length,0)
  assert.ok(state.lists.some(list=>list.id==='foreign'));assert.ok(state.items.some(item=>item.id==='c'))
  assert.deepEqual({songs:state.songs,favorites:state.favorites,chordPlaylists:state.chordPlaylists},unrelated)
})
test('likes work only for public lists and do not expose private list existence',async()=>{
  const before=structuredClone(state)
  assert.equal((await likes.POST(req({playlistId:'foreign'}))).status,404);assert.deepEqual(state,before)
  assert.deepEqual(await (await likes.POST(req({playlistId:'public'}))).json(),{liked:true})
  assert.deepEqual(await (await likes.POST(req({playlistId:'public'}))).json(),{liked:false})
})
test('database errors return a safe failure rather than leaking credentials or pretending an empty catalog',async()=>{
  fail=true
  const response=await detail.GET(req({},'GET'),ctx());assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/credentials|private-database/)
})
