/* eslint-disable @typescript-eslint/no-require-imports -- Isolated cache and quota tests; no external requests. */
const {test}=require('node:test'),assert=require('node:assert/strict')
const {metadata,key,fresh}=require('./lib/youtube-metadata.cjs')
const NOW=Date.UTC(2026,10,1),DAY=86400000
const source=i=>({kind:'video',id:String(i).padStart(11,'0')})
function fixture(){
  const rows=new Map(),state={requests:0,budget:0,blocked:false,fail:false,omit:new Set()},calls=[]
  const db={query:async(sql,v=[])=>{
    if(sql.startsWith('SELECT *'))return {rows:[...rows.values()].filter(r=>v[0].includes(key({kind:r.kind,id:r.sourceId})))}
    if(sql.startsWith('INSERT INTO public."YouTubeMetadataBudget"')){if(state.blocked||state.budget>=200)return {rows:[]};state.budget++;return {rows:[{requests:state.budget}]}}
    if(sql.startsWith('INSERT INTO public."YouTubeMetadata"')){
      const claimed=[]
      for(const id of v[1]){const k=v[0]+':'+id,old=rows.get(k);if(old&&(old.leaseUntil>NOW||old.retryAfter>NOW||fresh(old,NOW)))continue;rows.set(k,{kind:v[0],sourceId:id,...old,leaseUntil:NOW+20000});claimed.push({sourceId:id})}
      return {rows:claimed}
    }
    if(sql.startsWith('UPDATE public."YouTubeMetadataBudget"')){state.blocked=true;return {rows:[]}}
    if(sql.includes('SET title=$1')){rows.set(v[2]+':'+v[3],{kind:v[2],sourceId:v[3],title:v[0],channelTitle:v[1],fetchedAt:new Date(NOW),retryAfter:NOW+6*3600000,leaseUntil:0});return {rows:[]}}
    if(sql.includes('SET "retryAfter"')){for(const id of v[1]){const row=rows.get(v[0]+':'+id);row.leaseUntil=0;row.retryAfter=NOW+900000}return {rows:[]}}
    throw Error('Unexpected cache query')
  }}
  const options={apiKey:'test-key',now:()=>NOW,request:async value=>{
    state.requests++;const url=new URL(value);calls.push(url)
    if(state.fail)return {ok:false,status:429,json:async()=>({error:{}})}
    return {ok:true,status:200,json:async()=>({items:url.searchParams.get('id').split(',').filter(id=>!state.omit.has(id)).map(id=>({id,snippet:{title:'Izvođač - Pesma '+id,channelTitle:'Probni kanal'}}))})}
  }}
  return {db,rows,state,options,calls}
}
test('duplicates use one metadata request and repeat reads use the shared cache',async()=>{
  const f=fixture(),sources=[source(1),source(1),source(2)]
  const first=await metadata(f.db,sources,f.options);assert.equal(first.values.size,2);assert.equal(f.state.requests,1)
  await metadata(f.db,sources,f.options);assert.equal(f.state.requests,1)
  assert.equal(f.calls[0].pathname,'/youtube/v3/videos');assert.equal(f.calls[0].searchParams.get('id').split(',').length,2)
})
test('video IDs are batched by fifty without searching or loading players',async()=>{
  const f=fixture(),result=await metadata(f.db,Array.from({length:51},(_,i)=>source(i)),f.options)
  assert.equal(result.values.size,51);assert.equal(f.state.requests,2);assert.ok(f.calls.every(u=>!u.pathname.includes('search')&&!u.pathname.includes('embed')))
})
test('playlist links use playlist metadata rather than pretending to be videos',async()=>{
  const f=fixture();await metadata(f.db,[{kind:'playlist',id:'PL1234567890'}],f.options);assert.equal(f.calls[0].pathname,'/youtube/v3/playlists')
})
test('leases avoid duplicate requests while another worker is fetching a video',async()=>{
  const f=fixture();f.rows.set(key(source(1)),{kind:'video',sourceId:source(1).id,leaseUntil:NOW+10000,retryAfter:0})
  await metadata(f.db,[source(1)],f.options);assert.equal(f.state.requests,0)
})
test('quota failures back off globally and do not return stale titles',async()=>{
  const f=fixture();f.state.fail=true;f.rows.set(key(source(1)),{kind:'video',sourceId:source(1).id,title:'Old title',fetchedAt:new Date(NOW-29*DAY),leaseUntil:0,retryAfter:0})
  const result=await metadata(f.db,[source(1)],f.options);assert.equal(result.values.size,0);assert.equal(f.state.requests,1)
  await metadata(f.db,[source(2)],f.options);assert.equal(f.state.requests,1);assert.equal(f.state.blocked,true)
})
test('missing videos have a negative cache and do not retry on every list view',async()=>{
  const f=fixture();f.state.omit.add(source(1).id)
  assert.equal((await metadata(f.db,[source(1)],f.options)).values.size,0)
  await metadata(f.db,[source(1)],f.options);assert.equal(f.state.requests,1)
})
test('invalid IDs and missing API credentials never make a YouTube request',async()=>{
  const f=fixture();await metadata(f.db,[{kind:'video',id:'../../bad'}],f.options);assert.equal(f.state.requests,0)
  await metadata(f.db,[source(1)],{...f.options,apiKey:''});assert.equal(f.state.requests,0)
})
test('a depleted daily application budget never starts a remote request',async()=>{
  const f=fixture();f.state.budget=200;await metadata(f.db,[source(1)],f.options);assert.equal(f.state.requests,0)
})
test('saved custom titles survive enrichment while generated ID labels are replaced',()=>{
  require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
  const {withYouTubeMetadata}=require('../lib/music/model.ts')
  const item={id:'item',title:'Moj omiljeni snimak',url:'https://youtu.be/00000000001',type:'youtube',order:0,source:source(1)},info={title:'Izvođač - Pesma',channelTitle:'Muzička kuća'}
  assert.equal(withYouTubeMetadata(item,info).title,item.title);assert.equal(item.youtubeTitle,undefined)
  assert.equal(withYouTubeMetadata({...item,title:'YouTube 00000000001'},info).title,info.title)
  assert.equal(withYouTubeMetadata(item,info).channelTitle,'Muzička kuća')
})
