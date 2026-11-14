/* eslint-disable @typescript-eslint/no-require-imports -- Discography parsing and public table regression cases. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const {normalizeDiscography:normalize,groupDiscography:groups,discographyEditorText}=require('../lib/discography.ts')
const {parseArtistDiscography}=require('../lib/adminContent/validation.ts')
test('section labels define release types instead of appearing as undated albums',()=>{
 const raw=['Albumi:','1984. Prvi','Drugi (1986)','Singl-ploče:','1984. Prvi','Kompilacije','Izbor (2004)','Live','2010 — Koncert']
 const result=groups(raw);assert.deepEqual(result.map(g=>[g.kind,g.albums.length]),[['studio',2],['live',1],['compilation',1],['single',1]])
 assert.equal(normalize(raw).length,5);assert.deepEqual(normalize(['Albumi','Singlovi','Kompilacije','Live']),[])
 assert.deepEqual(parseArtistDiscography(raw.join('\n')),raw)
})
test('publisher and year are separated while meaningful title years and qualifiers remain intact',()=>{
 assert.deepEqual(normalize(['Primer (PGP RTB, 1977)','Drugi (Jugoton) — 1981.','Treći (1990, Third Ear Music)','Hits 1970-2010 (2011)','1989','2000 — Naziv (1999)']),[
  {title:'Primer',year:'1977',kind:'album',publisher:'PGP RTB'},{title:'Drugi',year:'1981',kind:'album',publisher:'Jugoton'},{title:'Treći',year:'1990',kind:'album',publisher:'Third Ear Music'},
  {title:'Hits 1970-2010',year:'2011',kind:'album'},{title:'1989',year:'',kind:'album'},{title:'Naziv (1999)',year:'2000',kind:'album'}])
})
test('named parent sections and mixed release headings keep every supplied release',()=>{
 const raw=['Prvi sastav','Studijski albumi','Album (1979)','Singlovi','Singl (1978)','Drugi sastav','Albumi','1984 — Album','Kompilacije, koncertni albumi i mini-albumi','Zajedničko izdanje (koncertni album / kompilacija) — 1989.']
 const result=groups(raw);assert.equal(normalize(raw).length,4)
 assert.deepEqual(result.map(g=>g.section),['Prvi sastav','Prvi sastav','Drugi sastav','Drugi sastav'])
 assert.equal(result.at(-1).label,'Kompilacije, koncertni albumi i mini-albumi');assert.equal(result.at(-1).albums[0].year,'1989')
})
test('editor round trip preserves source metadata, nested objects and string-list formatting',()=>{
 const raw=[{title:'Album',year:'2000',kind:'studio',publisher:'Records',source:{hash:'abc',license:'CC BY-SA',revision:12},custom:['one','two']}],before=JSON.stringify(raw)
 assert.deepEqual(parseArtistDiscography(discographyEditorText(raw)),raw);assert.equal(JSON.stringify(raw),before)
 assert.equal(discographyEditorText(['Albumi','2000 — Album']),'Albumi\n2000 — Album')
 assert.deepEqual(normalize(raw),[{title:'Album',year:'2000',kind:'studio',publisher:'Records'}])
 assert.equal(parseArtistDiscography('[{"title":"Singl","year":2001,"kind":"single"}]')[0].kind,'single')
})
test('public table shows separated sections, dates and publisher without rendering headings as albums',()=>{
 const load=Module._load;Module._load=function(request,parent,main){
  if(request==='./UiText')return{__esModule:true,default:({text})=>text}
  if(request.endsWith('.module.css'))return{__esModule:true,default:new Proxy({},{get:(_,key)=>key})}
  if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2));return load.call(this,request,parent,main)
 };let Table;try{Table=require('../app/components/DiscographyTable.tsx').default}finally{Module._load=load}
 const React=require('react'),$=require('cheerio').load(require('react-dom/server').renderToStaticMarkup(React.createElement(Table,{value:['Albumi','Naziv (PGP RTB, 1977)','Singlovi','1978 — Singl']})))
 assert.equal($('[data-discography-group]').length,2);assert.equal($('tbody tr').length,2)
 assert.equal($('tbody tr').first().find('td').text(),'1977');assert.equal($('.publisher').text(),'Izdavač: PGP RTB');assert.ok(!$('tbody tr').text().includes('Albumi'))
})
