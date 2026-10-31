/* eslint-disable @typescript-eslint/no-require-imports -- Offline refinement of pinned maintenance data. */
const fs=require('node:fs/promises'),path=require('node:path'),{parseArgs}=require('node:util')
const {extractArticle,wikipediaClient}=require('./lib/artist-wiki-core.cjs')
const {hash}=require('./lib/artist-wiki-store.cjs')
const {normalizeName}=require('./lib/artist-image-core.cjs')
const ROOT=path.resolve(__dirname,'..')
async function main(){
  const {values}=parseArgs({options:{report:{type:'string',default:'reports/artist-wiki/completion-2026-10-31/report.json'},out:{type:'string',default:'reports/artist-wiki/completion-2026-10-31/refined-report.json'}}})
  const report=JSON.parse(await fs.readFile(path.resolve(ROOT,values.report),'utf8'))
  const client=wikipediaClient(path.join(ROOT,'reports/artist-images/cache'))
  client.request=async()=>{throw Error('PINNED_CACHE_MISSING')}
  const reviewed=[]
  for(const artist of report.artists){
    const change=artist.changes?.discography,source=artist.proposal?.discographySource
    if(!change)continue
    try{
      const parsed=await client.json(`https://${source.language}.wikipedia.org/w/api.php?`+new URLSearchParams({action:'parse',oldid:String(source.revisionId),prop:'text|revid',format:'json',formatversion:'2'}))
      if(parsed.parse?.revid!==source.revisionId||typeof parsed.parse?.text!=='string')throw Error('PINNED_REVISION_MISMATCH')
      const albums=extractArticle(parsed.parse.text,{subjectKind:artist.proposal.evidence,strictAlbums:true}).albums
      artist.proposal.discography=albums
      if(albums.length && hash(albums)!==hash(change.before)){
        if(hash(albums)!==hash(change.after))reviewed.push({id:artist.id,name:artist.name,before:change.after.length,after:albums.length,reason:'Explicit album sections only'})
        change.after=albums;artist.proposal.discography=albums
      }else{
        delete artist.changes.discography
        reviewed.push({id:artist.id,name:artist.name,reason:albums.length?'No change to current list':'Release types not established by the source'})
      }
    }catch(e){delete artist.changes.discography;reviewed.push({id:artist.id,name:artist.name,reason:e.message})}
  }
  const nameKey=value=>normalizeName(value).split(' ').sort().join(' ')
  const groups=new Map()
  for(const artist of report.artists)if(artist.proposal?.state==='identified-content'&&artist.proposal.wikidataId){
    const key=nameKey(artist.name);groups.set(key,[...(groups.get(key)||[]),artist])
  }
  let recovered=0
  for(const artist of report.artists){
    if(artist.bio?.trim()||artist.changes?.bio)continue
    const candidates=groups.get(nameKey(artist.name))||[]
    if(new Set(candidates.map(a=>a.proposal.wikidataId)).size!==1)continue
    const candidate=candidates.find(a=>a.proposal.bio?.length>=200&&a.proposal.bioSource)
    if(!candidate)continue
    artist.changes=artist.changes||{}
    artist.changes.bio={before:artist.bio,after:candidate.proposal.bio,reason:'Same verified artist identity with reordered or accent-normalized name'}
    artist.proposal={...artist.proposal,state:'identified-content',wikidataId:candidate.proposal.wikidataId,evidence:candidate.proposal.evidence,bio:candidate.proposal.bio,bioSource:candidate.proposal.bioSource}
    if((!Array.isArray(artist.discography)||!artist.discography.length)&&candidate.changes?.discography){
      artist.changes.discography={before:artist.discography,after:candidate.changes.discography.after,reason:'Same verified artist; explicit album sections'}
      artist.proposal.discography=candidate.changes.discography.after;artist.proposal.discographySource=candidate.proposal.discographySource
    }
    recovered++
  }
  report.summary={...report.summary,bios:report.artists.filter(a=>a.changes?.bio).length,discographies:report.artists.filter(a=>a.changes?.discography).length,discographyReviews:reviewed.length}
  report.summary.recoveredAliases=recovered
  report.refinedAt=new Date().toISOString();report.discographyReviews=reviewed
  const out=path.resolve(ROOT,values.out);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2))
  console.log(JSON.stringify(report.summary))
}
main().catch(e=>{console.error(e.code||e.name);process.exitCode=1})
