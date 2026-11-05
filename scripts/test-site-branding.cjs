/* eslint-disable @typescript-eslint/no-require-imports -- Branding authorization, atomic audit and public-data boundary fixtures. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),{renderToStaticMarkup}=require('react-dom/server')
const model=require('../lib/branding/model.ts'),original=Module._load
let allowed,authCalls,row,failRead,failAudit,changes,queries,cached,invalidations
const version='a4b1eaad-883e-4816-b8d6-bd377fc191bb'
async function query(strings){queries.push(strings.join('?'));if(failRead)throw Error('private-database-secret');return row?[structuredClone(row)]:[]}
async function execute(strings,...values){
 const sql=strings.join('?');queries.push(sql)
 if(sql.startsWith('UPDATE'))row={config:JSON.parse(values[0]),version:values[1],updatedAt:values[3],updatedById:values[2]}
 else if(sql.startsWith('INSERT')){if(failAudit)throw Error('audit unavailable');changes.push({id:values[0],before:JSON.parse(values[1]),after:JSON.parse(values[2]),beforeVersion:values[3],afterVersion:values[4],actorId:values[5]})}
 return 1
}
const prisma={$queryRaw:query,$transaction:async work=>{const before=structuredClone(row),audit=structuredClone(changes);try{return await work({$queryRaw:query,$executeRaw:execute})}catch(error){row=before;changes=audit;throw error}}}
Module._load=function(request,parent,main){
 if(request==='@/lib/prisma')return{prisma}
 if(request==='@/lib/adminSongs/server')return{requireSongAdmin:async()=>{authCalls++;if(!allowed)throw Object.assign(Error('forbidden'),{status:403});return{id:'real-admin'}}}
 if(request==='next/cache')return{unstable_cache:work=>async()=>cached||(cached=await work()),revalidateTag:tag=>{invalidations.push(tag);cached=null}}
 if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2))
 return original.call(this,request,parent,main)
}
let server,route,Page,Slogan,action
try{server=require('../lib/branding/server.ts');route=require('../app/api/site-branding/route.ts');Page=require('../app/admin/izgled/page.tsx').default;Slogan=require('../app/components/BrandSlogan.tsx').default;action=require('../app/admin/izgled/actions.ts')}finally{Module._load=original}
beforeEach(()=>{allowed=true;authCalls=0;failRead=false;failAudit=false;changes=[];queries=[];cached=null;invalidations=[];row={config:structuredClone(model.DEFAULT_BRANDING),version,updatedAt:new Date('2026-11-05T12:00:00Z')}})
const input=()=>({version,config:{...structuredClone(model.DEFAULT_BRANDING),intervalSeconds:18},actorId:'forged-admin'})

test('all five requested slogans are initial content, and arbitrary admin text is preserved as plain data',()=>{
 assert.equal(model.DEFAULT_BRANDING.slogans.length,5)
 const config=structuredClone(model.DEFAULT_BRANDING);config.slogans[0].text='  <b>Moj novi tekst</b>  ';config.slogans[0].textEn=''
 assert.equal(model.validateBranding(config).slogans[0].text,'<b>Moj novi tekst</b>')
 for(const bad of [{...config,intervalSeconds:0},{...config,rotate:'yes'},{...config,slogans:[]},{...config,slogans:Array(51).fill(config.slogans[0])},{...config,slogans:[{...config.slogans[0],text:'x'.repeat(161)}]},{...config,slogans:[{...config.slogans[0],enabled:false}]},{...config,slogans:[config.slogans[0],config.slogans[0]]}])assert.throws(()=>model.validateBranding(bad),error=>error.status===400)
})
test('disabled drafts and private audit metadata never enter the public response',async()=>{
 row.config.slogans[0].enabled=false;row.config.slogans[0].text='Unpublished draft';row.updatedById='private-admin';row.history='secret-history'
 const response=await route.GET(),body=await response.json()
 assert.equal(response.status,200);assert.equal(body.slogans.length,4);assert.equal(response.headers.get('cache-control'),'no-store')
 assert.doesNotMatch(JSON.stringify(body),/Unpublished draft|private-admin|secret-history|version|updatedById/)
 assert.equal(authCalls,0)
})
test('every admin read and write requires current authorization even after a public cache hit',async()=>{
 await server.readPublicBranding();allowed=false
 await assert.rejects(server.readAdminBranding(),error=>error.status===403)
 await assert.rejects(server.saveBranding(input()),error=>error.status===403)
 assert.equal(authCalls,2);assert.equal(changes.length,0)
})
test('a save stores before/after audit and trusted actor together, then invalidates only public branding',async()=>{
 const previous=structuredClone(row.config),saved=await server.saveBranding(input())
 assert.notEqual(saved.version,version);assert.equal(saved.config.intervalSeconds,18);assert.equal(changes.length,1)
 assert.deepEqual(changes[0].before,previous);assert.deepEqual(changes[0].after,saved.config);assert.equal(changes[0].actorId,'real-admin');assert.equal(changes[0].afterVersion,row.version)
 assert.deepEqual(invalidations,[model.BRANDING_TAG]);assert.ok(queries.some(sql=>sql.includes('FOR UPDATE')))
})
test('stale edits cannot overwrite a newer save or append a misleading audit record',async()=>{
 await server.saveBranding(input());const current=structuredClone(row)
 await assert.rejects(server.saveBranding(input()),error=>error.status===409)
 assert.deepEqual(row,current);assert.equal(changes.length,1)
})
test('audit failure rolls back content changes and does not invalidate successful cached content',async()=>{
 const before=structuredClone(row);failAudit=true
 await assert.rejects(server.saveBranding(input()),/audit unavailable/)
 assert.deepEqual(row,before);assert.deepEqual(changes,[]);assert.deepEqual(invalidations,[])
})
test('saving an unchanged configuration does not manufacture changes or revisions',async()=>{
 const saved=await server.saveBranding({version,config:structuredClone(row.config)})
 assert.equal(saved.version,version);assert.deepEqual(changes,[]);assert.ok(!queries.some(sql=>/^(UPDATE|INSERT)/.test(sql)))
})
test('database outages are explicit, never leaked or presented as a successful save',async()=>{
 failRead=true
 assert.equal((await server.readAdminBranding()).available,false)
 const response=await route.GET();assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private-database-secret/)
 const result=await action.saveBrandingAction(input());assert.equal(result.ok,false);assert.doesNotMatch(result.error,/private-database-secret/)
})
test('admin editor explains unsaved drafts and disabled persistence while public SSR needs no database read',async()=>{
 const html=renderToStaticMarkup(await Page());assert.ok(html.includes('Dodaj slogan'));assert.ok(html.includes('Sačuvaj slogane'));assert.ok(html.includes('Engleski prevod je opcion'))
 const before=queries.length,publicHtml=renderToStaticMarkup(require('react').createElement(Slogan))
 assert.equal(queries.length,before);assert.ok(publicHtml.includes('Za znalce'));assert.ok(publicHtml.includes('aria-live="off"'))
  assert.ok(!publicHtml.includes('data-active="true"'),'retired default slogans cannot flash before saved configuration loads')
 failRead=true;const missing=renderToStaticMarkup(await Page());assert.ok(missing.includes('Čuvanje je onemogućeno'));assert.ok(missing.includes('<fieldset disabled'))
})
