/* eslint-disable @typescript-eslint/no-require-imports -- Reject heavy module initialization on ordinary public reads. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const root=path.resolve(__dirname,'..'),original=Module._load
let parserLoads=0,allowParser=false
const version=require('../lib/music/assessment-version.json').algorithmHash
const song={id:'saved',title:'Saved',slug:'saved',category:'domace',artist:{name:'Band',slug:'band'},performers:[],musicAssessment:{version,sourceHash:'a'.repeat(64),level:'very_easy',chords:['C','G','Am']}}
const tx={$queryRaw:async()=>[song],song:{findMany:async query=>{assert.equal(query.select.lyrics,undefined,'Stored reads must not fetch source text');return [song]}}}
const prisma={...tx,$transaction:async work=>work(tx)}
Module._load=function(request,parent,main){
 if(request==='chord-symbol/lib/chord-symbol.js'){parserLoads++;if(!allowParser){const chain=[];for(let p=parent;p;p=p.parent)chain.push(p.id);throw Error('Public read initialized the musical parser: '+chain.join(' <- '))}}
 if(request==='@/lib/prisma')return{prisma}
 if(request==='@/lib/adminContent/server')return{contentAdmin:async()=>null}
 if(request==='react')return{...original.call(this,request,parent,main),cache:fn=>fn}
 if(request==='next/cache')return{unstable_cache:fn=>fn}
 if(request==='next/link')return{__esModule:true,default:({children,...props})=>{delete props.prefetch;return require('react').createElement('a',props,children)}}
 if(request.endsWith('.module.css'))return{__esModule:true,default:new Proxy({},{get:(_,key)=>key})}
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
test('public catalog route renders stored cards without initializing the chord parser',async()=>{
 const Page=require('../app/plejliste/[id]/page.tsx')
 const {renderToStaticMarkup}=require('react-dom/server')
 const rendered=await require('../app/components/PlaylistCatalog.tsx').default({slug:'veoma-lako'})
 assert.match(renderToStaticMarkup(rendered),/Saved/)
 assert.equal(typeof Page.generateMetadata,'function');assert.equal(parserLoads,0)
})
test('artist metadata and rows reuse stored assessments without loading the parser',async()=>{
 const cards=await require('../lib/artists/publicCatalog.ts').readArtistSongCards('band')
 assert.deepEqual(cards[0].assessment,{level:'very_easy',hasChords:true})
 const rows=await require('../app/components/ArtistSongList.tsx').default({category:'domace',artist:'band',songs:cards})
 assert.match(require('react-dom/server').renderToStaticMarkup(rows),/Saved/);assert.equal(parserLoads,0)
})
test('empty fallback and catalog navigation definitions stay independent of the parser',async()=>{
 assert.equal((await require('../lib/music/readDifficulty.ts').assessMissingSongs([])).size,0)
 const entries=require('../lib/playlists/catalog-model.ts').catalogEntries
 assert.equal(entries.length,11);assert.equal(parserLoads,0)
})
test('missing source data still loads the existing parser and preserves its assessment',async()=>{
 allowParser=true
 const {assessMissingSongs}=require('../lib/music/readDifficulty.ts')
 const results=await assessMissingSongs([{id:'missing',lyrics:'C G Am',chords:null}])
 assert.deepEqual(results.get('missing'),{level:'very_easy',chords:['C','G','Am']});assert.equal(parserLoads,1)
})
test.after(()=>{Module._load=original})
