/* eslint-disable @typescript-eslint/no-require-imports -- Node regression tests for reviewed maintenance. */
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {scope,redirects,hash,corePlan,dedupePlan,assertCurrent,verifyRedirects}=require('./lib/catalog-maintenance.cjs')
function fixture() {
  const artists=scope.missingArtists.map(row=>({...row,bio:'Existing biography',image:null}))
  const songs=scope.categorySongs.map(row=>({id:row.id,artistId:row.artistId,title:row.title,slug:row.slug,category:row.songCategory,lyrics:'Am C\nPreserve this content',chords:'Am C',popularity:12}))
  for(const row of scope.categorySongs)artists.push({id:row.artistId,name:row.artist,slug:row.artistSlug,category:row.artistCategory,bio:null,image:null})
  artists.push({id:scope.rename.id,name:scope.rename.before,slug:'van-der-graaf-generatora',category:'strane',bio:null})
  songs.push({id:scope.emptySong,artistId:'cmmxt63dd0982ob3gqvrysmud',title:'',slug:'',category:'narodne',lyrics:'',chords:'',popularity:0})
  return {artists,songs,songReferences:[{table:'SongReview',column:'songId',rows:[{songId:scope.emptySong,status:'needs_fix',reviewedById:'fixture'}]}],artistReferences:[]}
}
test('approved core repair preserves all song content, IDs, slugs, biographies and photos',()=>{
  const data=fixture(),before=structuredClone(data),ops=corePlan(data)
  assert.deepEqual(data,before)
  assert.equal(ops.filter(op=>op.table==='Artist'&&op.after?.category==='strane'&&op.before.category===null).length,20)
  assert.equal(ops.filter(op=>op.table==='Song'&&op.after).length,6)
  assert.equal(ops.filter(op=>op.after===null).length,2)
  for(const op of ops.filter(op=>op.after)) {
    const differences=Object.keys(op.after).filter(key=>hash(op.before[key])!==hash(op.after[key]))
    assert.equal(differences.length,1)
    assert.ok(['category','name'].includes(differences[0]))
  }
})
test('stale categories, a changed identity or new blank-song references abort instead of expanding approval',()=>{
  for(const mutate of [data=>data.artists[0].category='domace',data=>data.artists[0].slug='renamed',data=>data.songs.at(-1).lyrics='New content',data=>data.songReferences.push({table:'Favorite',column:'songId',rows:[{songId:scope.emptySong,userId:'fixture'}]})]) {
    const data=fixture();mutate(data);assert.throws(()=>corePlan(data))
  }
})
function duplicateFixture() {
  const reviewed=structuredClone(scope),data={artists:[{id:scope.retainArtist.id,name:'Miroslav Rus',slug:'miroslav-rus',category:'domace'},{id:scope.removeArtist.id,name:'Rus Miroslav',slug:'rus-miroslav',category:'domace',bio:null,bioShort:null,image:null,discography:null,members:null}],songs:[],songReferences:[],artistReferences:[]}
  for(const [index,pair]of reviewed.pairs.entries()) {
    for(const [key,artistId]of [['keep',scope.retainArtist.id],['remove',scope.removeArtist.id]])data.songs.push({id:pair[key].id,slug:pair[key].slug,artistId,title:'Fixture '+index,lyrics:'Am\nFixture line '+index,chords:null})
    const song=data.songs.at(-1);pair.contentHash=hash([song.title,song.lyrics,song.chords])
  }
  return {data,reviewed}
}
test('only all 27 exact original-content pairs allow duplicate cleanup',()=>{
  const {data,reviewed}=duplicateFixture(),ops=dedupePlan(data,reviewed)
  assert.equal(ops.length,28);assert.ok(ops.every(op=>op.after===null))
  assert.equal(ops.filter(op=>op.table==='Song').length,27)
  data.songs[1].lyrics+='\nOne difference';assert.throws(()=>dedupePlan(data,reviewed),/content changed/)
})
test('any new dependent row or artist content blocks duplicate deletion',()=>{
  for(const mutate of [data=>data.songReferences.push({table:'PlaylistSong',column:'songId',rows:[{songId:scope.pairs[0].remove.id}]}),data=>data.artistReferences.push({table:'ArtistWikiProfile',column:'artistId',rows:[{artistId:scope.removeArtist.id}]}),data=>data.artists[1].bio='New biography']) {
    const {data,reviewed}=duplicateFixture();mutate(data);assert.throws(()=>dedupePlan(data,reviewed))
  }
})
test('rollback refuses to overwrite newer edits or restore over a reused ID',()=>{
  const data=fixture(),ops=corePlan(data),post=structuredClone(data)
  for(const op of ops) {
    const rows=op.table==='Artist'?post.artists:op.table==='Song'?post.songs:post.songReferences[0].rows
    const index=rows.findIndex(row=>row[op.key]===op.id)
    if(op.after===null)rows.splice(index,1);else rows[index]=op.after
  }
  assert.doesNotThrow(()=>assertCurrent(ops,post,true))
  post.artists[0]={...post.artists[0],bio:'A later manual edit'}
  assert.throws(()=>assertCurrent(ops,post,true),/stale rollback/)
})
test('deletion gate requires deployed same-origin 308 redirects, working targets and playlist query preservation',async()=>{
  const rules=redirects.slice(0,1)
  const good=async url=>url.pathname===rules[0].source?new Response(null,{status:308,headers:{location:rules[0].destination+url.search}}):new Response(null,{status:200})
  assert.equal((await verifyRedirects('https://site.example',good,rules)).checked,1)
  for(const bad of [async()=>new Response(null,{status:200}),async()=>new Response(null,{status:307,headers:{location:rules[0].destination}}),async()=>new Response(null,{status:308,headers:{location:'https://other.example'+rules[0].destination}}),async()=>new Response(null,{status:308,headers:{location:rules[0].destination}})])await assert.rejects(verifyRedirects('https://site.example',bad,rules))
  await assert.rejects(verifyRedirects('http://localhost',good,rules))
})
test('redirect rules have unique exact sources, no loops and no private/account routes',()=>{
  assert.equal(redirects.length,36)
  const sources=new Set(redirects.map(rule=>rule.source));assert.equal(sources.size,redirects.length)
  for(const rule of redirects){assert.ok(!sources.has(rule.destination));assert.ok(/^\/(pesme|biografija)\//.test(rule.source));assert.equal(rule.permanent,true)}
})
test('restoration passes exact PostgreSQL timestamp text and nullable content to the database',async()=>{
  const {mutate}=require('./catalog-maintenance.cjs'),calls=[]
  const row={id:'fixture',createdAt:'2026-11-07 18:01:02.123456',title:'Fixture',lyrics:'Am\nFixture line',chords:null}
  await mutate({query:async(sql,args)=>{calls.push({sql,args});return{rowCount:1}}},[{table:'Song',key:'id',id:row.id,before:row,after:null}],true)
  assert.equal(calls.length,1);assert.match(calls[0].sql,/jsonb_populate_record/)
  assert.deepEqual(JSON.parse(calls[0].args[0]),row)
})
