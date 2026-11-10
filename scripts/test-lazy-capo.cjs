/* eslint-disable @typescript-eslint/no-require-imports -- Deterministic on-demand calculation and cancellation tests. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const {createCapoRecommendations}=require('../lib/chords/capoRecommendations.ts')
const {parseSongSheet}=require('../lib/chords/songSheet.ts'),{capoSource}=require('../lib/chords/capoDisplay.ts')
const make=(id='song',transpose=0)=>{const lines=parseSongSheet('F#m D A E\nProbni stih');return{id,lines,transpose,source:capoSource(lines)}}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
test('constructing controls imports and calculates nothing; opening reports loading before calculation',async()=>{
 let loads=0,ranks=0;const updates=[],paint=deferred(),scope=make()
 const controller=createCapoRecommendations(v=>updates.push(v),async()=>{loads++;return{rankCapos:()=>{ranks++;return[{fret:2}]}}},()=>paint.promise)
 assert.equal(loads,0);assert.equal(ranks,0)
 const result=controller.read(scope);await Promise.resolve();await Promise.resolve()
 assert.equal(updates[0].phase,'loading');assert.equal(loads,1);assert.equal(ranks,0)
 paint.resolve();assert.deepEqual(await result,[{fret:2}]);assert.equal(ranks,1);assert.equal(updates.at(-1).phase,'ready')
})
test('duplicate opens share work, and closing before load prevents ranking and stale updates',async()=>{
 let ranks=0;const module=deferred(),updates=[],scope=make(),controller=createCapoRecommendations(v=>updates.push(v),()=>module.promise,async()=>{})
 const first=controller.read(scope),second=controller.read(scope);assert.strictEqual(first,second)
 controller.release();module.resolve({rankCapos:()=>{ranks++;return[{fret:2}]}})
 assert.deepEqual(await first,[]);assert.equal(ranks,0);assert.equal(updates.at(-1).phase,'idle');assert.equal(controller.scope,null)
})
test('a newer song or transpose cannot receive results from an earlier request',async()=>{
 const old=deferred(),updates=[];let loads=0
 const controller=createCapoRecommendations(v=>updates.push(v),()=>++loads===1?old.promise:Promise.resolve({rankCapos:()=>[{fret:4}]}),async()=>{})
 const a=controller.read(make('old'));await Promise.resolve()
 const b=controller.read(make('new',2));assert.deepEqual(await b,[{fret:4}])
 old.resolve({rankCapos:()=>{throw Error('Stale request must not calculate')}});assert.deepEqual(await a,[])
 assert.equal(updates.at(-1).scope.id,'new');assert.equal(updates.at(-1).phase,'ready')
})
test('failed module loading is retryable and release drops cached options',async()=>{
 let loads=0;const updates=[],scope=make(),controller=createCapoRecommendations(v=>updates.push(v),async()=>{if(++loads===1)throw Error('offline');return{rankCapos:()=>[{fret:2}]}},async()=>{})
 assert.deepEqual(await controller.read(scope),[]);assert.equal(updates.at(-1).phase,'error')
 assert.deepEqual(await controller.read(scope),[{fret:2}]);controller.release();assert.deepEqual(updates.at(-1).options,[])
})
test('initial and saved capo rendering works without loading the recommendation engine',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),original=Module._load;let hook,heavyLoads=0
 Module._load=function(request,parent,main){if(request.endsWith('/capo')||request==='./capo'){heavyLoads++;throw Error('Premature recommendation import')}if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2));return original.call(this,request,parent,main)}
 try{hook=require('../app/components/useSongCapo.ts').default}finally{Module._load=original}
 let result;const scope=make()
 function Harness(){result=hook('song',scope.lines,0,{id:'song',fret:2});return null}
 renderToStaticMarkup(React.createElement(Harness));assert.equal(result.fret,2);assert.equal(result.shift,-2);assert.equal(result.active,true);assert.deepEqual(result.options,[]);assert.equal(result.recommendationPhase,'idle');assert.equal(heavyLoads,0)
})
