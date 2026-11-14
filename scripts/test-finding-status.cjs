/* eslint-disable @typescript-eslint/no-require-imports -- Current-content decisions retain their exact version and historical evidence. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const {findingVersion}=require('./lib/catalog-finding-version.cjs'),{findingStatus,decisionMatches}=require('../lib/monitoring/finding-status.ts')
const finding={id:'missing-discography-a',subject:'artist',subjectId:'a',field:'discography',kind:'diskografije',name:'Bend',title:'Diskografija nedostaje',observed:'Raniji nalaz',next:'Popuni podatke',confidence:'missing',requiresApproval:false,expectedHash:'old',state:'resolved',currentVersion:'a'.repeat(64),href:'/biografija/domace/bend',editHref:'/admin/artists/a/edit'}
test('filled missing fields close automatically while unrelated edits and unavailable states remain open',()=>{
 assert.equal(findingStatus(finding),'resolved');assert.equal(findingStatus({...finding,state:'changed',confidence:'confirmed-mismatch'}),'open')
 assert.equal(findingStatus({...finding,state:'unavailable'}),'open');assert.equal(findingStatus({...finding,state:'removed'}),'removed')
})
test('an explicit decision closes the current edited version and expires after a subsequent edit',()=>{
 const edited={...finding,state:'changed',confidence:'confirmed-mismatch'},decision={operation:'resolve',currentVersion:edited.currentVersion}
 assert.equal(findingStatus(edited,decision),'resolved');assert.equal(decisionMatches(edited,decision),true)
 assert.equal(findingStatus({...edited,currentVersion:'b'.repeat(64)},decision),'open')
 assert.equal(findingStatus(edited,{...decision,operation:'dismiss'}),'dismissed');assert.equal(findingStatus(finding,{...decision,operation:'reopen'}),'open')
 assert.equal(findingStatus(edited,'resolve'),'open');assert.equal(findingStatus({...edited,state:'unchanged'},'resolve'),'resolved')
})
test('fingerprints bind identities and the reviewed field while ignoring unrelated metadata',()=>{
 const row={id:'a',name:'Bend',slug:'bend',category:'domace',discography:['2000 — Album'],bio:'Keep bio'},version=findingVersion(finding,row)
 assert.equal(version,findingVersion(finding,{...row,bio:'New bio'}));assert.notEqual(version,findingVersion(finding,{...row,discography:['2001 — Other']}))
 assert.notEqual(version,findingVersion(finding,{...row,name:'Other band'}))
})
test('resolved findings leave the default open list and retain a visible checked historical view',()=>{
 const original=Module._load;Module._load=function(request,parent,main){
  if(request==='./FindingActions')return{__esModule:true,default:()=>null}
  if(request==='next/link')return{__esModule:true,default:({children,...props})=>{delete props.prefetch;return require('react').createElement('a',props,children)}}
  if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2));return original.call(this,request,parent,main)
 };let Component;try{Component=require('../app/admin/nadzor/CatalogFindings.tsx').default}finally{Module._load=original}
 const React=require('react'),render=require('react-dom/server').renderToStaticMarkup,review={checkedAt:'2026-11-01T12:00:00Z',songCheckedAt:'2026-11-01T12:00:00Z',summary:{artists:1,biographies:1,discographies:0,photos:0,songs:1,songsNeedingTechnicalReview:0},findings:[finding]}
 const props={review,selection:{kind:'sve',page:1,status:'otvoreni'}};assert.doesNotMatch(render(React.createElement(Component,props)),/data-finding-status=/)
 const html=render(React.createElement(Component,{...props,selection:{...props.selection,status:'reseni'}}));assert.match(html,/data-finding-status="resolved"/);assert.match(html,/Diskografija je popunjena/);assert.match(html,/Raniji nalaz/)
})
