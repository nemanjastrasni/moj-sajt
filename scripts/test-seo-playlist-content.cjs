/* eslint-disable @typescript-eslint/no-require-imports -- Public catalog SEO fixtures without live accounts or DB. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio')
const {catalogBrowseHref}=require('../lib/playlists/catalog-url.ts'),{playlistCatalogContent,playlistCatalogMetadata}=require('../lib/seo/playlistContent.ts'),{catalogEntry}=require('../lib/playlists/catalog-model.ts'),{playlistReturnHref}=require('../lib/navigation/parent.ts')
const root=path.resolve(__dirname,'..'),original=Module._load
let locale='sr',page=1,reads=0,Catalog
Module._load=function(request,parent,main){
 if(request==='next/link')return{__esModule:true,default:props=>{const clean={...props};delete clean.prefetch;return React.createElement('a',clean,clean.children)}}
 if(request.endsWith('UiText'))return{__esModule:true,default:({text,values={}})=>text.replace(/\{(\w+)\}/g,(_,k)=>values[k]),CategoryLabel:({value})=>value,useI18n:()=>({locale,t:s=>s})}
 if(request==='@/lib/playlists/catalog-server')return{catalogPageNumber:v=>Number(v)||1,catalogPage:async()=>{reads++;return{total:60,pages:2,current:page,songs:[{id:'s',title:'Probna pesma',slug:'probna',category:'domace',artist:{name:'Bend',slug:'bend'},level:'easy'}]}}}
 if(request==='@/lib/prisma')throw Error('Unexpected DB access')
 if(request.endsWith('.css'))return{__esModule:true,default:{}}
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
try{Catalog=require('../app/components/PlaylistCatalog.tsx').default}finally{Module._load=original}

test('catalog first-page links are clean while filters and later pages retain distinct URLs',()=>{
 assert.equal(catalogBrowseHref('beginner'),'/plejliste/beginner')
 assert.equal(catalogBrowseHref('beginner',1,'strane'),'/plejliste/beginner?category=strane')
 assert.equal(catalogBrowseHref('beginner',2,'strane'),'/plejliste/beginner?page=2&category=strane')
 assert.equal(catalogBrowseHref('beginner',1,'private'),'/plejliste/beginner')
 for(const href of [catalogBrowseHref('beginner'),catalogBrowseHref('beginner',1,'strane'),catalogBrowseHref('beginner',2,'domace')])assert.equal(playlistReturnHref(href),href)
})
test('public choices explain actual selection rules, with distinct useful search titles',()=>{
 const titles=new Set()
 for(const slug of ['beginner','4-akorda','acoustic']){const text=playlistCatalogMetadata(catalogEntry(slug),null,1);titles.add(text.title);assert.match(text.title,/gitaru/);assert.equal(text.title,playlistCatalogContent(slug).title)}
 assert.equal(titles.size,3);assert.match(playlistCatalogContent('4-akorda').intro.sr,/najviše četiri/);assert.match(playlistCatalogContent('acoustic').intro.sr,/samo akorde C, D, E, G, A, Am, Dm i Em/)
 const filtered=playlistCatalogMetadata(catalogEntry('beginner'),'Strane',2);assert.match(filtered.title,/Strane.*Strana 2/);assert.match(filtered.description,/Kategorija: Strane\. Strana 2\./)
 assert.equal(playlistCatalogContent('__proto__'),null)
})
test('visible catalog descriptions and guide links render in both languages without changing song return context',async()=>{
 for(const lang of ['sr','en'])for(const slug of ['beginner','4-akorda','acoustic']){
  locale=lang;page=1;reads=0;const $=load(renderToStaticMarkup(await Catalog({slug,category:'domace'})))
  assert.equal($('h1').length,1);assert.equal($('h1').text(),playlistCatalogContent(slug).heading[lang]);assert.ok($('p').text().includes(playlistCatalogContent(slug).intro[lang]));assert.equal(reads,1)
  assert.equal($('a[href*="page=1"]').length,0)
  for(const href of ['/akordi','/vodici/kako-se-citaju-akordi-za-gitaru','/vodici/vezbanje-promene-akorda'])assert.ok($(`a[href="${href}"]`).length)
  const song=new URL($('a[href^="/pesme/"]').attr('href'),'https://test.example');assert.equal(song.searchParams.get('playlist'),'/plejliste/'+slug+'?category=domace')
 }
 locale='sr';page=2;const $=load(renderToStaticMarkup(await Catalog({slug:'beginner'})));assert.equal($('nav[aria-label="Stranice"] a').first().attr('href'),'/plejliste/beginner')
})
