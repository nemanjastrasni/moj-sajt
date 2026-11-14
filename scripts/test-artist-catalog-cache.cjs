/* eslint-disable @typescript-eslint/no-require-imports -- Public card cache boundaries and exact results, without live DB access. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const root=path.join(__dirname,'..'),original=Module._load,cacheStore=new Map(),definitions=[]
let reads,artists,songs,down,assessments
const prisma={artist:{findMany:async q=>{reads.push(['artist',q]);if(down)throw Error('db-secret');return artists.filter(a=>a.category===q.where.category)}},song:{findMany:async q=>{reads.push(['song',q]);if(down)throw Error('db-secret');return songs}}}
prisma.$transaction=async(work,options)=>{assert.equal(options.isolationLevel,'RepeatableRead');return work(prisma)}
Module._load=function(request,parent,main){
 if(request==='@/lib/prisma')return{prisma}
 if(request==='react')return{...original.call(this,request,parent,main),cache:fn=>fn}
 if(request==='next/cache')return{unstable_cache:(fn,keys,options)=>{definitions.push({keys,options});return(...args)=>{const key=JSON.stringify([keys,args]);if(!cacheStore.has(key))cacheStore.set(key,fn(...args).catch(e=>{cacheStore.delete(key);throw e}));return cacheStore.get(key)}}}
 if(request==='@/lib/music/difficulty'){const actual=original.call(this,path.join(root,'lib/music/difficulty'),parent,main);return{...actual,estimateDifficulty:s=>{assessments++;return actual.estimateDifficulty(s)}}}
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
let catalog;try{catalog=require('../lib/artists/publicCatalog.ts')}finally{Module._load=original}
const artist=(name,id=name)=>({id,name,slug:id,category:'domace',image:null,songs:[{id:id+'-song',performers:[]}],performances:[],bio:'private-large-bio-must-not-be-cached'})
beforeEach(()=>{reads=[];down=false;assessments=0;cacheStore.clear();artists=[artist('Azra'),artist('Bajaga'),artist('Džej'),artist('Ljubav'),artist('Njiva'),artist('123 Band')];songs=[{id:'one',slug:'one',title:'Prva',lyrics:'C G Am\nProbni zapis',chords:null,artist:{slug:'Azra',category:'domace'},performers:[]},{id:'two',slug:'two',title:'Druga',lyrics:'Samo probni tekst',chords:null,artist:{slug:'Azra',category:'domace'},performers:[]}]})
test('letters and category share one cached index without storing relation lists or biography text',async()=>{
 const a=await catalog.readLetterArtistCards('domace','A'),b=await catalog.readLetterArtistCards('domace','B')
 assert.deepEqual(a.map(x=>x.name),['Azra']);assert.deepEqual(b.map(x=>x.name),['Bajaga'])
 await catalog.readArtistCards('domace');assert.equal(reads.length,1)
 assert.doesNotMatch(JSON.stringify(await catalog.readArtistCards('domace')),/private-large|performances|performers|lyrics/)
 assert.equal(a[0].songCount,1);assert.equal(a[0]._count.songs,1)
})
test('Serbian digraphs, numbers, collaboration exclusions and distinct performance counts are preserved',async()=>{
 artists[0].performances=[{songId:'Azra-song'},{songId:'guest-song'}]
 artists.push({...artist('AB duet'),songs:[{id:'duet',performers:[{artistId:'a'},{artistId:'b'}]}]})
 assert.deepEqual((await catalog.readLetterArtistCards('domace','DŽ')).map(x=>x.name),['Džej'])
 assert.deepEqual((await catalog.readLetterArtistCards('domace','LJ')).map(x=>x.name),['Ljubav'])
 assert.deepEqual((await catalog.readLetterArtistCards('domace','NJ')).map(x=>x.name),['Njiva'])
 assert.deepEqual((await catalog.readLetterArtistCards('domace','#')).map(x=>x.name),['123 Band'])
 const a=await catalog.readLetterArtistCards('domace','A');assert.equal(a.length,1);assert.equal(a[0].songCount,2)
})
test('cached song cards preserve assessments and links without retaining lyrics or recalculating on warm requests',async()=>{
 const a=await catalog.readArtistSongCards('Azra'),b=await catalog.readArtistSongCards('Azra')
 assert.deepEqual(a,b);assert.equal(reads.length,2);assert.equal(assessments,2)
 assert.equal(a[0].assessment.hasChords,true);assert.equal(a[1].assessment.hasChords,false)
 assert.equal(a[0].artist.slug,'Azra');assert.doesNotMatch(JSON.stringify(a),/Probni zapis|Samo probni tekst|lyrics|chords/)
 assert.ok(definitions.some(d=>d.options.tags.includes('public-artist-songs')))
})
test('category boundaries are distinct, invalid categories skip DB, errors retry, and refresh observes edits',async()=>{
 assert.deepEqual(await catalog.readArtistCards('invalid'),[]);assert.equal(reads.length,0)
 down=true;await assert.rejects(catalog.readArtistCards('domace'));down=false
 await catalog.readArtistCards('domace');await catalog.readArtistCards('strane');assert.equal(reads.length,3)
 artists.push(artist('Anja'));cacheStore.clear();assert.equal((await catalog.readLetterArtistCards('domace','A')).length,2)
})

test('persisted artist assessments require no source text reads or recalculation',async()=>{
 const {assessSong}=require('../lib/music/assessment.ts')
 for(const song of songs)song.musicAssessment=assessSong(song)
 const result=await catalog.readArtistSongCards('Azra')
 assert.equal(reads.length,1);assert.equal(assessments,0)
 assert.equal(reads[0][1].select.lyrics,undefined);assert.equal(reads[0][1].select.chords,undefined)
 assert.equal(result[0].assessment.hasChords,true);assert.equal(result[1].assessment.hasChords,false)
})
