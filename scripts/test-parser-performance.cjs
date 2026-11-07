/* eslint-disable @typescript-eslint/no-require-imports -- Verify parser cache bounds and display-only module boundaries. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module')
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),cheerio=require('cheerio')
const root=path.join(__dirname,'..')
function isolatedParser(){
  const original=Module._load,calls=new Map(),filename=path.join(root,'lib/chords/chordSymbols.ts'),instance=new Module(filename,module)
  instance.filename=filename;instance.paths=Module._nodeModulePaths(path.dirname(filename))
  Module._load=function(request,parent,main){
    const real=original.call(this,request,parent,main)
    if(request!=='chord-symbol/lib/chord-symbol.js')return real
    return {...real,chordParserFactory:options=>{const parse=real.chordParserFactory(options);return symbol=>{calls.set(symbol,(calls.get(symbol)||0)+1);return parse(symbol)}}}
  }
  try{instance._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename)}finally{Module._load=original}
  return {...instance.exports,calls}
}
test('ordinary lyric candidates cannot flush a cached chord after the former 2048-entry boundary',()=>{
  const parser=isolatedParser(),first=parser.parseChordSymbol('C')
  for(let i=0;i<2300;i++)assert.equal(parser.parseChordSymbol('not-a-chord-'+i),null)
  assert.equal(parser.parseChordSymbol('C'),first);assert.equal(parser.calls.get('C'),1)
  assert.equal(parser.parseChordSymbol('not-a-chord-2299'),null);assert.equal(parser.calls.get('not-a-chord-2299'),1)
})
test('negative-cache overflow evicts the oldest candidate without clearing recent candidates or chords',()=>{
  const parser=isolatedParser(),first=parser.parseChordSymbol('Am')
  for(let i=0;i<8193;i++)parser.parseChordSymbol('not-a-chord-'+i)
  parser.parseChordSymbol('not-a-chord-8192');assert.equal(parser.calls.get('not-a-chord-8192'),1)
  parser.parseChordSymbol('not-a-chord-0');assert.equal(parser.calls.get('not-a-chord-0'),2)
  assert.equal(parser.parseChordSymbol('Am'),first);assert.equal(parser.calls.get('Am'),1)
})
test('positive cache is bounded independently and retains recent valid symbols',()=>{
  const parser=isolatedParser(),notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],symbols=[]
  for(const root of notes)for(const bass of notes)for(const descriptor of ['','m','7','maj7','m7','sus2','sus4','6'])symbols.push(root+descriptor+'/'+bass)
  for(const symbol of symbols)assert.ok(parser.parseChordSymbol(symbol),symbol)
  const recent=symbols.at(-1);parser.parseChordSymbol(recent);assert.equal(parser.calls.get(recent),1)
  parser.parseChordSymbol(symbols[0]);assert.equal(parser.calls.get(symbols[0]),2)
})
test('long candidates still use the real parser but cannot occupy the bounded caches',()=>{
  const parser=isolatedParser(),symbol='not-a-chord-'+ 'x'.repeat(129)
  assert.equal(parser.parseChordSymbol(symbol),null);assert.equal(parser.parseChordSymbol(symbol),null);assert.equal(parser.calls.get(symbol),2)
})
function loadUi(file,options={}){
  const original=Module._load,filename=path.join(root,file)
  delete require.cache[require.resolve(filename)]
  Module._load=function(request,parent,main){
    if(request==='chord-symbol/lib/chord-symbol.js'&&options.rejectParser)throw Error('Badge initialized the chord parser')
    if(request==='@/lib/prisma')return {prisma:{}}
    if(request==='@/lib/adminContent/server')return {contentAdmin:async()=>null}
    if(request==='@/lib/music/difficulty'&&options.assess)return {estimateDifficulty:options.assess,difficultyExplanation:'Fixture explanation'}
    if(request==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}
    if(request==='./UiText')return {__esModule:true,default:({text})=>text,useI18n:()=>({t:value=>value})}
    if(request.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>key})}
    if(request.startsWith('@/'))request=path.join(root,request.slice(2))
    return original.call(this,request,parent,main)
  }
  try{return require(filename)}finally{Module._load=original}
}
test('all difficulty badges render their unchanged labels without initializing the musical parser',()=>{
  const Badge=loadUi('app/components/SongDifficulty.tsx',{rejectParser:true}).default
  const model=require('../lib/music/difficultyModel.ts')
  for(const level of [...model.difficultyLevels,null]){
    const $=cheerio.load(renderToStaticMarkup(React.createElement(Badge,{level})))
    assert.equal($('span').text(),level?model.difficultyLabels[level]+' *':'Nije procenjeno')
    assert.equal($('span').attr('title'),model.difficultyExplanation)
  }
})
test('artist rows assess each song once while preserving chord/text indicators, difficulty and links',()=>{
  let calls=0
  const {ArtistSongRows}=loadUi('app/components/ArtistSongList.tsx',{assess:song=>{calls++;return {level:song.id==='chords'?'very_easy':null,chords:song.id==='chords'?['C']:[]}}})
  const songs=[{id:'chords',slug:'chords',title:'With chords',lyrics:'C',difficulty:'beginner'},{id:'text',slug:'text',title:'Text only',lyrics:'Fixture',difficulty:'beginner'}]
  const $=cheerio.load(renderToStaticMarkup(React.createElement(ArtistSongRows,{songs,category:'domace',artist:'fixture',artistId:'fixture-id'})))
  assert.equal(calls,2);assert.equal($('li').length,2)
  assert.match($('li').first().text(),/🎸 With chords/);assert.match($('li').last().text(),/🎵 Text only/)
  assert.equal($('a').first().attr('href'),'/pesme/domace/fixture/chords?artist=fixture-id')
})
