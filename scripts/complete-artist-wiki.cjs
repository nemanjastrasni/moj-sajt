/* eslint-disable @typescript-eslint/no-require-imports -- Resumable read-only catalogue maintenance. */
const fs = require('node:fs/promises'), path = require('node:path')
const { parseArgs } = require('node:util')
const { readArtists, hashValue } = require('./artist-wiki.cjs')
const { discoverContent, wikipediaClient, planBio } = require('./lib/artist-wiki-core.cjs')
const { normalizeName } = require('./lib/artist-image-core.cjs')
const ROOT = path.resolve(__dirname,'..')
async function main() {
  const { values } = parseArgs({ options: { ca:{type:'string'}, out:{type:'string',default:'reports/artist-wiki/completion-2026-10-31'}, limit:{type:'string',default:'2000'} } })
  require('@next/env').loadEnvConfig(ROOT)
  const artists = await readArtists(values.ca), directory = path.resolve(ROOT,values.out)
  await fs.mkdir(directory,{recursive:true})
  const file=path.join(directory,'report.json'), identities=new Map()
  for (const name of ['ready','reviewed-plan','popular-plan','balanced-plan','provenance-current']) {
    try {
      const data=JSON.parse(await fs.readFile(path.join(ROOT,'reports/artist-wiki',name,'report.json'),'utf8'))
      for(const a of data.artists||data.results||[]) {
        const id=a.proposal?.wikidataId||a.wikidataId
        if(id && a.name) identities.set(normalizeName(a.name),id)
      }
    } catch {}
  }
  for(const a of require('../public/artist-wiki/manifest.json').artists) identities.set(normalizeName(a.artistName),a.wikidataId)
  let report={version:2,source:'live-database',createdAt:new Date().toISOString(),artists:[]}
  try { report=JSON.parse(await fs.readFile(file,'utf8')) }catch(e){if(e.code!=='ENOENT')throw e}
  const completed=new Map(report.artists.map(a=>[a.id,a])), client=wikipediaClient(path.join(ROOT,'reports/artist-images/cache'))
  const managed = new Map(require('../public/artist-wiki/manifest.json').artists.filter(a=>a.discography).map(a=>[a.artistId,a.discography.hash]))
  const selected=artists.filter(a=>!a.bio?.trim() || !Array.isArray(a.discography)||!a.discography.length || managed.get(a.id)===hashValue(a.discography)).sort((a,b)=>Number(!!a.bio?.trim())-Number(!!b.bio?.trim()) || b.songCount-a.songCount).slice(0,Number(values.limit))
  const save=async()=>{
    const rows=[...completed.values()]
    report.artists=rows
    report.summary={total:artists.length,candidates:selected.length,inspected:rows.length,bios:rows.filter(a=>a.changes?.bio).length,discographies:rows.filter(a=>a.changes?.discography).length,states:rows.reduce((m,a)=>(m[a.proposal.state]=(m[a.proposal.state]||0)+1,m),{})}
    const tmp=file+'.tmp';await fs.writeFile(tmp,JSON.stringify(report,null,2));await fs.rename(tmp,file)
  }
  let done=0
  for(const artist of selected){
    const old=completed.get(artist.id)
    if(old && old.discoveryVersion===2 && old.name===artist.name && old.slug===artist.slug && hashValue(old.bio)===hashValue(artist.bio) && hashValue(old.discography)===hashValue(artist.discography) && !['request-failed','http-429','http-503'].includes(old.proposal.state)){done++;continue}
    let proposal
    try {proposal=await discoverContent({...artist,wikidataId:identities.get(normalizeName(artist.name))},client,{includeOtherAlbums:true})}
    catch(e){proposal={state:e.status?'http-'+e.status:'request-failed'}}
    const changes={},bio=planBio(artist.bio,proposal.bio)
    if(bio.action==='replace')changes.bio={before:artist.bio,after:bio.value,reason:bio.reason}
    if((!Array.isArray(artist.discography)||!artist.discography.length || managed.get(artist.id)===hashValue(artist.discography)) && proposal.discography?.length && hashValue(artist.discography)!==hashValue(proposal.discography))changes.discography={before:artist.discography,after:proposal.discography,reason:'Confirmed Wikipedia album list; types kept separate'}
    completed.set(artist.id,{...artist,discoveryVersion:2,proposal,changes});done++
    await save()
    console.log(JSON.stringify({done,total:selected.length,name:artist.name,state:proposal.state,changes:Object.keys(changes)}))
    if(proposal.state==='http-429')break
  }
  await save();console.log(JSON.stringify(report.summary))
}
if(require.main===module)main().catch(e=>{console.error(e.code||e.name);process.exitCode=1})
