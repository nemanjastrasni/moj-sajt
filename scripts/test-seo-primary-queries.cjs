/* eslint-disable @typescript-eslint/no-require-imports -- Render public entry pages without network or DB. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio')
const root=path.resolve(__dirname,'..'),original=Module._load
let locale='sr',chords,basics,content
Module._load=function(request,parent,main){
 if(request==='next/link')return{__esModule:true,default:props=>{const clean={...props};delete clean.prefetch;return React.createElement('a',clean,clean.children)}}
 if(request.endsWith('/UiText')||request==='./UiText')return{__esModule:true,default:({text})=>text,useI18n:()=>({locale})}
 if(request.endsWith('/prisma'))throw Error('Unexpected database access')
 if(request.endsWith('.css'))return{__esModule:true,default:{}}
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
try{chords=require('../app/akordi/page.tsx');basics=require('../lib/guitarBasics.ts');content=require('../lib/seo/content.ts')}finally{Module._load=original}

test('guitar chord landing renders eight real shapes and crawlable root links without JavaScript',()=>{
 const $=load(renderToStaticMarkup(React.createElement(chords.default)))
 assert.equal($('h1').length,1);assert.equal($('h1').text(),'Akordi za gitaru')
 assert.match(chords.metadata.title,/Gitarski akordi/);assert.equal(new URL(chords.metadata.alternates.canonical).pathname,'/akordi')
 assert.equal($('figure svg').length,8)
 const expected={Em:[0,2,2,0,0,0],Am:[-1,0,2,2,1,0],C:[-1,3,2,0,1,0],G:[3,2,0,0,0,3],D:[-1,-1,0,2,3,2],Dm:[-1,-1,0,2,3,1],E:[0,2,2,1,0,0],A:[-1,0,2,2,2,0]}
 assert.deepEqual(Object.fromEntries(basics.basicGuitarChords.map(c=>[c.name,[...c.frets]])),expected)
 for(const c of basics.basicGuitarChords){const fig=$('figure').filter((_,el)=>$(el).find('figcaption').text()===c.name);assert.equal(fig.length,1);assert.equal(fig.find('svg circle').length,c.frets.filter(f=>f>0).length);assert.equal(fig.find('svg').attr('role'),'img');assert.ok($(`a[href="/akordi/${c.root}"]`).length)}
 for(const a of $('a[href^="#"]').toArray())assert.equal($(`[id="${$(a).attr('href').slice(1)}"]`).length,1)
 assert.equal($('[hidden],.sr-only').length,0)
})
test('new chord explanations remain available in English',()=>{
 locale='en';try{const $=load(renderToStaticMarkup(React.createElement(chords.default)));assert.match($('p').text(),/standard E–A–D–G–B–E tuning/);assert.match($('h2').text(),/Basic guitar chords/)}finally{locale='sr'}
})
test('biography description uses existing opening text, preserves names and never cuts a word',()=>{
 const bio='Bilja Krstić je pevačica poznata po izvođenju tradicionalne muzike. '+ 'Dodatni podaci o muzičkoj karijeri. '.repeat(15)
 const metadata=content.biographyMetadataText({name:'Bilja Krstić',bio})
 assert.ok(metadata.description.startsWith('Bilja Krstić je pevačica'))
 assert.ok(metadata.description.length<=165);assert.ok(metadata.description.endsWith('…'))
 assert.ok(bio.startsWith(metadata.description.slice(0,-1)))
 assert.equal(content.biographySummary('Kratko.'),'')
 assert.equal(content.biographyMetadataText({name:'X',bio:'Biografija nije dostupna.'}).title,'X – Profil izvođača')
})
test('song descriptions advertise guitar chords only when present in the visible chart',()=>{
 const song={title:'Pesma',artist:{name:'Izvođač'},lyrics:'Am Dm E7\nProbni tekst'}
 assert.match(content.songMetadataText(song).description,/Akordi za gitaru/)
 assert.doesNotMatch(content.songMetadataText({...song,lyrics:'Samo običan tekst.'}).description,/akordi za gitaru/i)
 assert.equal(content.songMetadataText(song,true).index,false)
})
