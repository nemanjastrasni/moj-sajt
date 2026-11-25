/* eslint-disable @typescript-eslint/no-require-imports -- Public crawl regressions without network or DB. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio')
const root=path.resolve(__dirname,'..'),original=Module._load
const letters=require('../lib/artists/catalogLetters.ts')
const artists=[{name:'Azra'},{name:'Džej'},{name:'Ljubav'},{name:'Njiva'},{name:'123 Band'},{name:'!Grupa'},{name:'Željko'},{name:'Ćira'},{name:'Бенд'},{name:'Quasi duet',collaboration:true}]
let reads=0,BioText,category
Module._load=function(request,parent,main){
 if(request==='next/link')return{__esModule:true,default:props=>{const clean={...props};delete clean.prefetch;return React.createElement('a',clean,clean.children)}}
 if(request==='next/navigation')return{notFound:()=>{throw Error('Not found')}}
 if(request.endsWith('/UiText')||request==='./UiText')return{__esModule:true,default:({text})=>text,useI18n:()=>({locale:'sr'})}
 if(request==='@/lib/artists/publicCatalog')return{readArtistCards:async()=>{reads++;return artists}}
 if(request.endsWith('/ArtistMosaic'))return{__esModule:true,default:()=>null}
 if(request.endsWith('.css'))return{__esModule:true,default:{}}
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
try{BioText=require('../app/biografija/components/BioText.tsx').default;category=require('../app/pesme/[category]/page.tsx')}finally{Module._load=original}

test('category alphabet matches exactly the nonempty letter pages, including digraphs and symbols',async()=>{
 const before=JSON.stringify(artists),available=letters.artistCatalogLetters(artists)
 assert.deepEqual(available,['#','A','DŽ','LJ','NJ','Ć','Ž'])
 for(const letter of available)assert.ok(letters.artistsForCatalogLetter(artists,letter).length)
 assert.deepEqual(letters.artistsForCatalogLetter(artists,'#').map(a=>a.name),['123 Band','!Grupa','Бенд'])
 assert.equal(letters.artistsForCatalogLetter(artists,'Q').length,0)
 const $=load(renderToStaticMarkup(await category.default({params:Promise.resolve({category:'domace'})})))
 assert.deepEqual($('nav[aria-label="A-Z"] a').map((_,a)=>$(a).text()).get(),available)
 assert.ok($('a[href="/pesme/domace/slovo/num"]').length)
 const content=$('h1,nav[aria-label="A-Z"]').toArray()
 assert.deepEqual(content.map(node=>node.name),['h1','nav'])
 const breadcrumbs=$('nav[aria-label="Putanja stranice"]')
 assert.deepEqual(breadcrumbs.find('a').map((_,a)=>$(a).attr('href')).get(),['/','/pesme'])
 assert.equal(breadcrumbs.find('[aria-current="page"]').text(),'Zabavne')
 assert.equal(reads,1);assert.equal(JSON.stringify(artists),before)
})

test('long biography is complete and escaped in initial HTML, while native details starts closed',()=>{
 const text='Uvod biografije sa slovima čćšđž. '.repeat(15)+'\n\nPoslednji pasus & <script>ne izvršavati</script>.'
 const html=renderToStaticMarkup(React.createElement(BioText,{text})),$=load(html)
 assert.equal($('details').length,1);assert.equal($('details').attr('open'),undefined)
 assert.equal($('[data-biography-preview]').text()+$('[data-biography-rest]').text(),text)
 assert.equal($('script').length,0);assert.ok(html.includes('&lt;script&gt;'))
 assert.equal($('details > summary').length,1);assert.equal($('button').length,0)
 assert.ok($('[data-biography-rest]').text().endsWith('ne izvršavati</script>.'))
})

test('short biographies are rendered once without disclosure controls or invented ellipses',()=>{
 for(const text of ['', 'Kratka biografija.', 'Ć'.repeat(300)]){
 const $=load(renderToStaticMarkup(React.createElement(BioText,{text})))
 assert.equal($('details,summary,button').length,0);assert.equal($('body').text(),text)
 }
})
