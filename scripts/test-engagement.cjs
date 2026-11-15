/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS regression harness. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {test,beforeEach,after}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const {Prisma}=require('@prisma/client'),{SubmissionError}=require('../lib/submissions/errors.ts'),{activityInput,returnRate}=require('../lib/engagement/model.ts')
let actor,allow,available,preference,queries,writes,clears,invalidations,access,report
const sql=(q,args)=>Array.isArray(q)?Prisma.sql(q,...args):q
const db={
  async $queryRaw(q,...args){q=sql(q,args);queries.push(q);if(!available)throw Error('secret-database-details');if(q.text.includes('RETURNING "userId"'))return[{userId:actor.id}];if(q.text.includes('AS report'))return[{report}];return actor.role==='admin'?[]:[{enabled:preference}]},
  async $executeRaw(q,...args){q=sql(q,args);writes.push(q);if(!available)throw Error('secret-database-details');if(q.text.includes('WHERE "userId"='))clears++;return 1},
  async $transaction(fn){return fn(db)},playlistSong:{async findFirst(){return access?{id:'membership'}:null}},listeningPlaylist:{async findFirst(){return access?{id:'music'}:null}},
}
const original=Module._load
Module._load=function(request,parent,main){
 if(request==='@/lib/prisma')return{prisma:db}
 if(request==='@/lib/submissions/server')return{submissionUser:async()=>{if(!actor)throw new SubmissionError(401,'Denied');if(actor.banned)throw new SubmissionError(403,'Denied');return actor}}
 if(request==='@/lib/adminSongs/server')return{requireSongAdmin:async()=>{if(!allow)throw new SubmissionError(actor?403:401,'Denied');return actor}}
 if(request==='next/cache')return{unstable_cache:fn=>fn,revalidateTag:()=>invalidations++}
 if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2))
 return original.call(this,request,parent,main)
}
const server=require('../lib/engagement/server.ts'),route=require('../app/api/engagement/route.ts'),settings=require('../app/api/engagement/preferences/route.ts')
Module._load=original
const oldEnv={SITE_URL:process.env.SITE_URL,NEXTAUTH_URL:process.env.NEXTAUTH_URL}
after(()=>{for(const[k,v]of Object.entries(oldEnv))if(v===undefined)delete process.env[k];else process.env[k]=v})
beforeEach(()=>{actor={id:'u1',role:'user'};allow=false;available=true;preference=false;queries=[];writes=[];clears=0;invalidations=0;access=true;report={seven:{active:1}};process.env.NEXTAUTH_URL='https://site.test';delete process.env.SITE_URL})
const req=(body,method='POST',origin='https://site.test')=>new Request('https://site.test/api/engagement',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
test('only supported bounded events and IDs are accepted; identity and content cannot be injected',()=>{
 assert.deepEqual(activityInput({kind:'active'}),{kind:'active'})
 for(const kind of ['playlist_song','performance'])assert.deepEqual(activityInput({kind,playlistId:'list-1',songId:'song_2'}),{kind,playlistId:'list-1',songId:'song_2'})
 assert.deepEqual(activityInput({kind:'music_play',playlistId:'list'}),{kind:'music_play',playlistId:'list'})
 for(const input of [null,[],{}, {kind:'active',userId:'victim'},{kind:'active',playlistId:'x'},{kind:'DROP TABLE'},{kind:'performance',playlistId:'x'}, {kind:'music_play',playlistId:'https://private'}, {kind:'music_play',playlistId:'x'.repeat(101)}, {kind:'music_play',playlistId:'x',title:'private title'}])assert.equal(activityInput(input),null)
})
test('small or immature return cohorts do not produce misleading percentages',()=>{assert.equal(returnRate({eligible:0,returned:0}),null);assert.equal(returnRate({eligible:4,returned:4}),null);assert.equal(returnRate({eligible:5,returned:2}),40)})
test('anonymous and banned accounts cannot read preferences or send events',async()=>{for(const value of [null,{id:'banned',banned:true}]){actor=value;assert.ok([401,403].includes((await settings.GET()).status));assert.ok([401,403].includes((await route.POST(req({kind:'active'}))).status))}assert.equal(writes.length,0)})
test('cross-origin and non-JSON events/preferences never write',async()=>{assert.equal((await route.POST(req({kind:'active'},'POST','https://evil.test'))).status,403);assert.equal((await settings.PUT(req({enabled:true},'PUT','https://evil.test'))).status,403);const request=new Request('https://site.test/api/engagement',{method:'POST',headers:{origin:'https://site.test'},body:'x'});assert.equal((await route.POST(request)).status,415);assert.equal(writes.length,0)})
test('malformed, excessive and forged event bodies are rejected before recording',async()=>{for(const body of [{kind:'active',userId:'u2'}, {kind:'performance'},{kind:'active',x:'x'.repeat(600)}])assert.ok([400,413].includes((await route.POST(req(body))).status));assert.equal(writes.length,0)})
test('new accounts are not opted in and unsupported/admin identities cannot enable recording',async()=>{const response=await settings.GET();assert.deepEqual(await response.json(),{eligible:true,enabled:false});actor.role='admin';assert.equal((await settings.PUT(req({enabled:true},'PUT'))).status,403);assert.equal(writes.length,0)})
test('consent off means no event writes; success remains private and uninformative',async()=>{const response=await route.POST(req({kind:'active'}));assert.equal(response.status,204);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(writes.length,0)})
test('a valid opted-in event uses server identity and fixed flags, never stores target IDs',async()=>{preference=true;const response=await route.POST(req({kind:'performance',playlistId:'private-list',songId:'private-song'}));assert.equal(response.status,204);const insert=writes.find(q=>q.text.includes('INSERT INTO'));assert.ok(insert);assert.ok(insert.values.includes('u1'));assert.ok(!insert.values.includes('private-list'));assert.ok(!insert.values.includes('private-song'));assert.match(insert.text,/FOR UPDATE OF p FOR SHARE OF u/);assert.match(insert.text,/ON CONFLICT/);assert.match(insert.text,/WHERE NOT/);assert.match(insert.text,/p.enabled/);assert.match(insert.text,/u.role<>'admin'/)})
test('playlist and music access is checked before recording and does not leak availability',async()=>{preference=true;access=false;for(const input of [{kind:'performance',playlistId:'hidden',songId:'x'},{kind:'music_play',playlistId:'hidden'}])assert.equal((await route.POST(req(input))).status,204);assert.equal(writes.length,0)})
test('withdrawal removes only the current account history and invalidates cached summaries',async()=>{const response=await settings.PUT(req({enabled:false},'PUT'));assert.equal(response.status,200);assert.equal(clears,1);assert.equal(invalidations,1);assert.deepEqual(writes[0].values,['u1']);assert.match(queries[1].text,/WHEN NOT EXCLUDED.enabled THEN NULL/)})
test('explicit opt-in never retroactively records activity and rejects unknown setting fields',async()=>{assert.equal((await settings.PUT(req({enabled:true},'PUT'))).status,200);assert.equal(writes.length,0);assert.equal((await settings.PUT(req({enabled:true,userId:'victim'},'PUT'))).status,400)})
test('database failures never pretend recording or preferences succeeded and do not leak errors',async()=>{available=false;for(const response of [await settings.GET(),await settings.PUT(req({enabled:true},'PUT')),await route.POST(req({kind:'active'}))]){assert.equal(response.status,503);assert.ok(!(await response.text()).includes('secret'))}})
test('fresh administrator authorization precedes every summary read, including cached reads',async()=>{await assert.rejects(()=>server.readEngagement(),e=>e.status===403);assert.equal(queries.length,0);allow=true;assert.deepEqual(await server.readEngagement(),{available:true,report});allow=false;await assert.rejects(()=>server.readEngagement(),e=>e.status===403)})
test('summary outages are unavailable, not false zero counts',async()=>{allow=true;available=false;assert.deepEqual(await server.readEngagement(),{available:false})})
test('SQL covers exact UTC windows, consent/role exclusions, distinct users, mature cohorts and aggregate output',()=>{const q=server.reportQuery();assert.match(q.text,/AT TIME ZONE 'UTC'/);assert.match(q.text,/today-41 AND today-14/);assert.match(q.text,/"firstDay"\+7 AND c\."firstDay"\+13/);assert.match(q.text,/GROUP BY n,d\."userId"/);assert.match(q.text,/today-89/);assert.doesNotMatch(q.text,/email|password|visitor|ip_address/i)})
test('SQL identifiers cannot be supplied outside the allowlisted enum',()=>{assert.throws(()=>server.recordQuery('u1',{kind:'DROP TABLE User'}));assert.throws(()=>server.recordQuery('u1',{kind:'active'}))})
