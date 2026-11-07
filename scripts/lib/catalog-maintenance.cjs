/* eslint-disable @typescript-eslint/no-require-imports -- Reviewed maintenance logic, also exercised by node:test. */
const crypto = require('node:crypto')
const scope = require('../data/catalog-maintenance-2026-11-07.json')
const redirects = require('../../lib/seo/legacy-redirects.json')
function stable(value) {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key,stable(value[key])]))
  return value
}
const hash = value => crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')
const contentHash = song => hash([song.title,song.lyrics,song.chords])
const rowKey = table => table === 'SongReview' ? 'songId' : 'id'
function requireThat(condition, message) { if (!condition) throw Error(message) }
function find(rows, id, key='id') { const row=rows.find(item=>item[key]===id);requireThat(row,'Reviewed record is missing: '+id);return row }
function noReferences(references, ids, allowed={}) {
  for (const reference of references) for (const row of reference.rows) {
    if (!ids.includes(row[reference.column])) continue
    requireThat(allowed[reference.table]?.includes(row[reference.column]),'New reference prevents removal: '+reference.table)
  }
}
function operation(table, before, after) {return {table,key:rowKey(table),id:before[rowKey(table)],before,after}}
function corePlan(snapshot,reviewedScope=scope) {
  const scope=reviewedScope
  const operations=[]
  for (const expected of scope.missingArtists) {
    const artist=find(snapshot.artists,expected.id)
    requireThat(artist.name===expected.name&&artist.slug===expected.slug&&artist.category===null,'Missing artist identity/category changed')
    requireThat(snapshot.songs.filter(song=>song.artistId===artist.id).every(song=>song.category==='strane'),'Artist has conflicting song categories')
    operations.push(operation('Artist',artist,{...artist,category:'strane'}))
  }
  for (const expected of scope.categorySongs) {
    const song=find(snapshot.songs,expected.id),artist=find(snapshot.artists,expected.artistId)
    requireThat(song.artistId===artist.id&&song.title===expected.title&&song.slug===expected.slug&&song.category===expected.songCategory&&artist.category===expected.artistCategory&&artist.slug===expected.artistSlug,'Reviewed song/category changed')
    operations.push(operation('Song',song,{...song,category:artist.category}))
  }
  const artist=find(snapshot.artists,scope.rename.id)
  requireThat(artist.name===scope.rename.before&&artist.slug==='van-der-graaf-generatora'&&artist.category==='strane','Rename identity changed')
  operations.push(operation('Artist',artist,{...artist,name:scope.rename.after}))
  const empty=find(snapshot.songs,scope.emptySong)
  requireThat(empty.title===''&&empty.slug===''&&empty.lyrics===''&&!empty.chords&&empty.artistId==='cmmxt63dd0982ob3gqvrysmud','Blank record changed')
  noReferences(snapshot.songReferences,[empty.id],{SongReview:[empty.id]})
  const reviews=snapshot.songReferences.find(reference=>reference.table==='SongReview')?.rows.filter(row=>row.songId===empty.id)??[]
  requireThat(reviews.length<=1,'Unexpected reviews')
  for(const review of reviews)operations.push(operation('SongReview',review,null))
  operations.push(operation('Song',empty,null))
  return operations
}
function dedupePlan(snapshot,reviewedScope=scope) {
  const scope=reviewedScope
  const keep=find(snapshot.artists,scope.retainArtist.id),remove=find(snapshot.artists,scope.removeArtist.id)
  for(const [artist,expected]of [[keep,scope.retainArtist],[remove,scope.removeArtist]]) {
    requireThat(artist.name===expected.name&&artist.slug===expected.slug&&artist.category===expected.category,'Duplicate artist identity changed')
    requireThat(snapshot.songs.filter(song=>song.artistId===artist.id).length===27,'Duplicate artist song count changed')
  }
  requireThat(['bio','bioShort','image'].every(key=>!remove[key])&&['discography','members'].every(key=>remove[key]===null||remove[key]===''||Array.isArray(remove[key])&&remove[key].length===0),'Duplicate artist acquired content')
  const ids=scope.pairs.map(pair=>pair.remove.id)
  noReferences(snapshot.songReferences,ids)
  noReferences(snapshot.artistReferences,[remove.id],{Song:[remove.id]})
  requireThat(scope.pairs.length===27&&new Set(ids).size===27&&new Set(scope.pairs.map(pair=>pair.keep.id)).size===27,'Invalid pair set')
  const operations=[]
  for(const pair of scope.pairs) {
    const a=find(snapshot.songs,pair.keep.id),b=find(snapshot.songs,pair.remove.id)
    requireThat(a.artistId===keep.id&&b.artistId===remove.id&&a.slug===pair.keep.slug&&b.slug===pair.remove.slug,'Duplicate pair identity changed')
    requireThat(a.title===b.title&&a.lyrics===b.lyrics&&a.chords===b.chords&&contentHash(a)===pair.contentHash,'Duplicate content changed')
    operations.push(operation('Song',b,null))
  }
  operations.push(operation('Artist',remove,null))
  return operations
}
function assertCurrent(operations,snapshot,rollback=false) {
  for(const op of operations) {
    const rows=op.table==='Artist'?snapshot.artists:op.table==='Song'?snapshot.songs:snapshot.songReferences.find(row=>row.table===op.table)?.rows??[]
    const current=rows.find(row=>row[op.key]===op.id)??null
    requireThat(hash(current)===hash(rollback?op.after:op.before),'Record changed; refusing stale '+(rollback?'rollback':'apply')+': '+op.id)
  }
}
async function verifyRedirects(origin, fetcher=fetch, rules=redirects) {
  const base=new URL(origin)
  requireThat(base.protocol==='https:'&&!base.username&&!base.password&&base.pathname==='/'&&!base.search&&!base.hash,'A trusted HTTPS origin is required')
  let checked=0
  for(const rule of rules) {
    requireThat(rule.permanent===true&&rule.source.startsWith('/')&&!rule.source.startsWith('//')&&rule.destination.startsWith('/')&&!rule.destination.startsWith('//')&&rule.source!==rule.destination,'Invalid redirect')
    const query='?playlist=%2Fplejliste%2Fredirect-check&play=1'
    const response=await fetcher(new URL(rule.source+query,base),{method:'HEAD',redirect:'manual',headers:{'User-Agent':'GitarAkordiMaintenance HeadlessChrome'},signal:AbortSignal.timeout(12000)})
    requireThat(response.status===308,'Deploy permanent redirects before deletion: '+rule.source)
    const target=new URL(response.headers.get('location')??'',base)
    const expected=new URL(rule.destination+query,base)
    requireThat(target.href===expected.href,'Unexpected redirect target or lost query: '+rule.source)
    const destination=await fetcher(new URL(rule.destination,base),{method:'HEAD',redirect:'manual',headers:{'User-Agent':'GitarAkordiMaintenance HeadlessChrome'},signal:AbortSignal.timeout(12000)})
    requireThat(destination.status===200,'Redirect destination is not live: '+rule.destination)
    checked++
  }
  return {origin:base.origin,checked,at:new Date().toISOString()}
}
module.exports={scope,redirects,hash,stable,rowKey,corePlan,dedupePlan,assertCurrent,verifyRedirects,requireThat}
