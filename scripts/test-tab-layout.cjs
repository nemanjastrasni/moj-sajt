/* eslint-disable @typescript-eslint/no-require-imports -- Presentation regression cases with synthetic tablature. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const {parseSongSheet}=require('../lib/chords/songSheet.ts'),{lyricsOnlyLines}=require('../lib/chords/lyricsOnly.ts')
const {tabDisplayRow,displaySheetLines,groupDisplaySheetLines,layoutTabBlock}=require('../lib/chords/tabLayout.ts')
const strings=['E','B','G','D','A','E']
const fixture=(width=54)=>strings.map((label,index)=>label+'|'+(index===1?'/14--14h16--16\\14':index===2?'(9)--9/11--11p9':'--0--2--').padEnd(width,'-')+'|'+(index===2?'  (9 not 8)':''))
test('leading slides and trailing annotations stay with all six strings without changing parsed source objects',()=>{
 const original=fixture(),lines=parseSongSheet(original.join('\n')),before=JSON.stringify(lines)
 assert.ok(lines.some(line=>line.kind==='lyrics'))
 const blocks=groupDisplaySheetLines(lines);assert.equal(blocks.length,1);assert.equal(blocks[0].tabLines.length,6)
 assert.deepEqual(blocks[0].tabLines.map(l=>l.text),original);assert.equal(JSON.stringify(lines),before)
 const notes=layoutTabBlock(blocks[0],26).annotations;assert.deepEqual(notes,[{label:'G|',text:'(9 not 8)'}])
})
test('every mobile continuation retains all strings, labels and exact source columns',()=>{
 const originals=fixture(),block=groupDisplaySheetLines(parseSongSheet(originals.join('\n')))[0]
 for(const columns of [18,24,32,40,72]){
  const result=layoutTabBlock(block,columns)
  for(const segment of result.segments){assert.equal(segment.rows.length,6);assert.ok(segment.rows.every(row=>row.length<=columns));assert.ok(segment.rows.every((row,index)=>row.startsWith(strings[index]+'|')))}
  for(let row=0;row<6;row++)assert.equal(result.segments.map(segment=>segment.rows[row].slice(segment.prefixWidth)).join(''),tabDisplayRow(originals[row]).music)
 }
})
test('wrapping never divides multidigit frets, hammer/pull, slide or parenthesized note events',()=>{
 for(const event of ['12','14h16','16p14','12b14r12','/14','16\\14','(12)','<12>','2h-4']){
  const rows=strings.map(label=>label+'|------'+event+'-------------------------|'),block=groupDisplaySheetLines(parseSongSheet(rows.join('\n')))[0],start=8,end=start+event.length
  for(const segment of layoutTabBlock(block,15).segments)assert.ok(!(start<segment.end&&segment.end<end),event+' split at '+segment.end)
 }
})
test('wider viewports fit more source columns and original mode keeps one shared block',()=>{
 const block=groupDisplaySheetLines(parseSongSheet(fixture().join('\n')))[0]
 assert.ok(layoutTabBlock(block,24).segments.length>layoutTabBlock(block,80).segments.length)
 const original=layoutTabBlock(block,24,false);assert.equal(original.segments.length,1)
 assert.deepEqual(original.segments[0].rows,fixture().map(row=>tabDisplayRow(row).music))
})
test('adjacent systems remain separate and ordinary lyrics/chords are not classified as tablature',()=>{
 const rows=fixture(),lines=parseSongSheet([...rows,...rows,'','Am G','Probni stih za proveru'].join('\n')),blocks=groupDisplaySheetLines(lines)
 assert.deepEqual(blocks.filter(b=>b.tabLines).map(b=>b.tabLines.length),[6,6])
 assert.equal(blocks.at(-1).lyricLine.text,'Probni stih za proveru')
 for(const text of ['E|This is ordinary prose','A --- ovo je tekst','Refren: C G','Page 2/7'])assert.equal(tabDisplayRow(text),undefined)
 assert.deepEqual(lyricsOnlyLines(displaySheetLines(parseSongSheet('Uvod: Am G\nProbni stih\n'+rows.join('\n')))),['Uvod:','Probni stih'])
})
test('original unlabelled and spaced tab rows keep their notation and the computation stays bounded',()=>{
 const rows=['e ---0------','h ---------','g ---------','d ---------','a ---------','e ---------'],block=groupDisplaySheetLines(parseSongSheet(rows.join('\n')))[0]
 assert.deepEqual(layoutTabBlock(block,80).segments[0].rows,rows)
 const long=groupDisplaySheetLines(parseSongSheet(strings.map(label=>label+'|'+('12--14h16--'.repeat(600))+'|').join('\n')))[0]
 const start=performance.now(),result=layoutTabBlock(long,24);assert.ok(result.segments.length>100);assert.ok(performance.now()-start<1500)
})
test('rendered systems use one pre per segment and inline rows, preserve notes and default to fit mode',()=>{
 const original=Module._load
 Module._load=function(request,parent,main){
  if(request==='./UiText')return{useI18n:()=>({t:value=>value})}
  if(request.endsWith('.module.css'))return{__esModule:true,default:new Proxy({},{get:(_,key)=>key})}
  if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2))
  return original.call(this,request,parent,main)
 }
 let Sheet;try{Sheet=require('../app/components/SongSheet.tsx').default}finally{Module._load=original}
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),$=require('cheerio').load(renderToStaticMarkup(React.createElement(Sheet,{lines:parseSongSheet(fixture(100).join('\n')),transpose:4,textSize:18,chordSize:18})))
 assert.equal($('[data-tab-block]').length,1);assert.equal($('[data-tab-block]').attr('data-tab-fit'),'true')
 assert.ok($('[data-tab-segment]').length>1)
 $('[data-tab-segment]').each((_,element)=>{assert.equal($(element).find('pre').length,1);assert.equal($(element).find('span[data-tab-row]').length,6)})
 assert.equal($('[data-tab-note]').text(),'G| (9 not 8)');assert.equal($('pre[data-tab-row]').length,0)
 assert.equal($('button[aria-pressed="true"]').text(),'Prilagodi ekranu')
})
