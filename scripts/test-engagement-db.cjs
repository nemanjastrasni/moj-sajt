/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in embedded PostgreSQL integration; no network/database credentials. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{Prisma}=require('@prisma/client')
test('engagement SQL: real PostgreSQL deduplication, UTC windows, consent withdrawal, access and cascading deletion',{skip:!process.env.ENGAGEMENT_PGLITE_MODULE},async()=>{
 const {PGlite}=require(process.env.ENGAGEMENT_PGLITE_MODULE),pg=new PGlite()
 const adapter=connection=>({
  async $queryRaw(q,...args){const s=Array.isArray(q)?Prisma.sql(q,...args):q;return(await connection.query(s.text,s.values)).rows},
  async $executeRaw(q,...args){const s=Array.isArray(q)?Prisma.sql(q,...args):q;return(await connection.query(s.text,s.values)).affectedRows},
  async $transaction(fn){return pg.transaction(tx=>fn(adapter(tx)))},
 })
 const db=adapter(pg),original=Module._load
 Module._load=function(request,parent,main){if(request==='@/lib/prisma')return{prisma:db};if(request==='@/lib/adminSongs/server')return{requireSongAdmin:async()=>({id:'admin'})};if(request==='next/cache')return{unstable_cache:fn=>fn,revalidateTag:()=>{}};if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2));return original.call(this,request,parent,main)}
 let server;try{server=require('../lib/engagement/server.ts')}finally{Module._load=original}
 try {
  await pg.exec(`SET TIME ZONE 'Pacific/Auckland'; CREATE TABLE public."User"(id text PRIMARY KEY,role text NOT NULL DEFAULT 'user',banned boolean NOT NULL DEFAULT false,"createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE public."Playlist"(id text PRIMARY KEY,"userId" text,"createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE public."ListeningPlaylist"(id text PRIMARY KEY,"userId" text,"createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP);
    CREATE ROLE anon; CREATE ROLE authenticated;
    INSERT INTO public."User"(id) VALUES ('one'),('two'),('off'),('old');INSERT INTO public."User"(id,role,banned) VALUES ('admin','admin',false),('banned','user',true);`)
  const migration=fs.readFileSync(path.join(__dirname,'../prisma/sql/engagement.sql'),'utf8');await pg.exec(migration);await pg.exec(migration)
  const policies=await pg.query(`SELECT relname,relrowsecurity,has_table_privilege('anon',oid,'SELECT') AS anon_read,has_table_privilege('authenticated',oid,'INSERT') AS user_write FROM pg_class WHERE relname IN ('EngagementConsent','EngagementConfig','EngagementDaily')`)
  assert.equal(policies.rows.length,3);assert.ok(policies.rows.every(r=>r.relrowsecurity&&!r.anon_read&&!r.user_write))
  assert.deepEqual(await server.preference('one'),{eligible:true,enabled:false});assert.deepEqual(await server.preference('admin'),{eligible:false,enabled:false})
  await server.recordActivity(db,'off',{kind:'active'});assert.equal((await pg.query('SELECT * FROM "EngagementDaily"')).rows.length,0)
  await server.savePreference('one',true);await server.recordActivity(db,'one',{kind:'active'});await server.recordActivity(db,'one',{kind:'active'})
  await server.recordActivity(db,'one',{kind:'performance',playlistId:'not-stored',songId:'not-stored'});await server.recordActivity(db,'one',{kind:'performance'});await server.recordActivity(db,'one',{kind:'music_play'})
  let rows=(await pg.query('SELECT * FROM "EngagementDaily"')).rows;assert.equal(rows.length,1);assert.equal(rows[0].performance,true);assert.equal(rows[0].music_play,true);assert.equal(rows[0].playlist_song,false)
  const first=(await pg.query('SELECT "firstDay" FROM "EngagementConsent" WHERE "userId"=$1',['one'])).rows[0].firstDay
  assert.ok(first);await server.savePreference('one',true);assert.deepEqual((await pg.query('SELECT "firstDay" FROM "EngagementConsent" WHERE "userId"=$1',['one'])).rows[0].firstDay,first)
  await server.savePreference('two',true);await server.savePreference('old',true)
  await pg.exec(`UPDATE "EngagementConsent" SET "firstDay"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-20 WHERE "userId" IN ('one','two');
    INSERT INTO "EngagementDaily"("userId",day,playlist_song) SELECT 'one',(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-10,true;
    INSERT INTO "EngagementDaily"("userId",day) SELECT 'two',(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-6;
    INSERT INTO "EngagementDaily"("userId",day) SELECT 'two',(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-14;
    INSERT INTO "EngagementDaily"("userId",day) SELECT 'old',(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date-90;
    INSERT INTO "EngagementConsent"("userId",enabled) VALUES ('admin',true),('banned',true);
    INSERT INTO "EngagementDaily"("userId",day) SELECT id,(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date FROM "User" WHERE id IN ('admin','banned');
    INSERT INTO "Playlist"(id,"userId") VALUES ('p1','one'),('p-admin','admin');
    INSERT INTO "ListeningPlaylist"(id,"userId") VALUES ('m1','two'),('m-admin','admin');`)
  let r=(await db.$queryRaw(server.reportQuery()))[0].report
  assert.equal(r.eligible,4);assert.equal(r.optedIn,3);assert.equal(r.seven.active,2);assert.equal(r.seven.repeat,0);assert.equal(r.thirty.active,2);assert.equal(r.thirty.repeat,2)
  assert.equal(r.seven.playlist,1);assert.equal(r.seven.performance,1);assert.equal(r.seven.music,1);assert.equal(r.cohort.eligible,2);assert.equal(r.cohort.returned,1)
  assert.equal(r.days.length,14);assert.equal(r.days.at(-1).active,1);assert.equal(r.inventory.registrations,4);assert.equal(r.inventory.playlists,1);assert.equal(r.inventory.musicLists,1)
  await server.purgeActivity();assert.equal((await pg.query('SELECT * FROM "EngagementDaily" WHERE "userId"=$1',['old'])).rows.length,0)
  await server.savePreference('one',false);assert.equal((await pg.query('SELECT * FROM "EngagementDaily" WHERE "userId"=$1',['one'])).rows.length,0)
  assert.equal((await pg.query('SELECT "firstDay" FROM "EngagementConsent" WHERE "userId"=$1',['one'])).rows[0].firstDay,null)
  await server.recordActivity(db,'one',{kind:'active'});assert.equal((await pg.query('SELECT * FROM "EngagementDaily" WHERE "userId"=$1',['one'])).rows.length,0)
  r=(await db.$queryRaw(server.reportQuery()))[0].report;assert.equal(r.seven.active,1);assert.equal(r.cohort.eligible,1)
  await pg.query('DELETE FROM "User" WHERE id=$1',['two']);assert.equal((await pg.query('SELECT * FROM "EngagementConsent" WHERE "userId"=$1',['two'])).rows.length,0);assert.equal((await pg.query('SELECT * FROM "EngagementDaily" WHERE "userId"=$1',['two'])).rows.length,0)
 } finally {await pg.close()}
})
