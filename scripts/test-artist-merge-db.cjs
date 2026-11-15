/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in PostgreSQL regression in a schema rolled back in full. */
const assert = require('node:assert/strict'), { randomBytes } = require('node:crypto'), { parseArgs } = require('node:util'), core = require('./lib/artist-merge.cjs'), { databaseClient } = require('./lib/artist-image-source.cjs');
async function main() {
    const { values } = parseArgs({ options: { ca: { type: 'string' } } });
    require('@next/env').loadEnvConfig(require('node:path').resolve(__dirname, '..'), false, { info() { }, error() { } });
    const client = await databaseClient(values.ca), schema = 'artist_merge_test_' + randomBytes(6).toString('hex'), db = { query: (sql, args) => client.query(sql.replaceAll('public.', `"${schema}".`), args) };
    const input = { action: 'apply', sourceId: 'source', targetId: 'target', choices: {}, confirmed: true };
    let checks = 0;
    const check = async (work) => { await client.query('SAVEPOINT test_case'); try {
        await work();
        checks++;
    }
    finally {
        await client.query('ROLLBACK TO SAVEPOINT test_case');
    } };
    const prepare = async () => ({ ...input, version: core.plan(await core.load(db, input), input).version });
    try {
        await client.query('BEGIN');
        await client.query(`CREATE SCHEMA "${schema}"`);
        await db.query(`CREATE TABLE public."User" (id text PRIMARY KEY,role text,banned boolean);
   CREATE TABLE public."Artist" (id text PRIMARY KEY,name text,slug text UNIQUE,category text,bio text,"bioShort" text,discography jsonb,image text,members jsonb,"createdAt" timestamp DEFAULT now());
   CREATE TABLE public."Song" (id text PRIMARY KEY,"artistId" text REFERENCES public."Artist"(id) ON DELETE CASCADE,title text,slug text,category text,lyrics text,chords text,"musicAssessment" jsonb,UNIQUE("artistId",slug));
   CREATE TABLE public."ArtistWikiProfile" ("artistId" text PRIMARY KEY REFERENCES public."Artist"(id) ON DELETE CASCADE,"artistName" text,slug text,"wikidataId" text,state text,"bioSource" jsonb,"discographySource" jsonb,"checkedAt" timestamp DEFAULT now());
   CREATE TABLE public."SongPerformer" ("songId" text REFERENCES public."Song"(id) ON DELETE CASCADE,"artistId" text REFERENCES public."Artist"(id) ON DELETE CASCADE,position int,PRIMARY KEY("songId","artistId"),UNIQUE("songId",position));
   CREATE TABLE public."Favorite" ("songId" text REFERENCES public."Song"(id) ON DELETE CASCADE);
   CREATE TABLE public."PlaylistSong" ("songId" text REFERENCES public."Song"(id) ON DELETE CASCADE);
   CREATE TABLE public."AdminContentProposal" (id text PRIMARY KEY,"findingId" text,"subjectId" text,field text,operation text,status text,data jsonb,"actorId" text,"createdAt" timestamp DEFAULT now(),"updatedAt" timestamp DEFAULT now());
   CREATE TABLE public."AdminContentEvent" (id text PRIMARY KEY,"proposalId" text REFERENCES public."AdminContentProposal"(id),action text,"actorId" text,"createdAt" timestamp DEFAULT now());
   INSERT INTO public."User" VALUES ('admin','admin',false),('user','user',false);
   INSERT INTO public."Artist" (id,name,slug,category,bio,image,discography) VALUES ('source','Lexington','lexington','narodne','Source biography',null,null),('target','Lexington Band','lexington-band','narodne','Target biography','/cover.webp','["2020 Album"]'),('other','Other','other','narodne',null,null,null);
   INSERT INTO public."Song" VALUES ('s1','source','Song','same','narodne','E A',null,'{"difficulty":"beginner"}'),('s2','source','Song 2','same-2','narodne','D G',null,null),('t1','target','Song','same','narodne','E A',null,null),('duet','other','Duet','duet','narodne','C F',null,null);
   INSERT INTO public."Favorite" VALUES ('s1'); INSERT INTO public."PlaylistSong" VALUES ('s1');
   INSERT INTO public."SongPerformer" VALUES ('duet','other',0),('duet','source',1),('duet','target',2);
   INSERT INTO public."ArtistWikiProfile" ("artistId","artistName",slug,"wikidataId",state,"bioSource") VALUES ('source','Lexington','lexington','Q1','reviewed','{"hash":"source-hash","author":"Author","revisionId":42,"license":"CC BY-SA"}'),('target','Lexington Band','lexington-band','Q1','reviewed','{"hash":"target-hash"}');`);

        await db.query(`ALTER TABLE public."AdminContentProposal" ADD CONSTRAINT "AdminContentProposal_field_check" CHECK (field IN ('bio','discography','finding'));
        ALTER TABLE public."AdminContentProposal" ADD CONSTRAINT "AdminContentProposal_operation_check" CHECK (operation IN ('replace','clear','resolve','dismiss','reopen'));
        ALTER TABLE public."AdminContentProposal" ADD CONSTRAINT "AdminContentProposal_data_check" CHECK (jsonb_typeof(data)='object' AND octet_length(data::text)<300000);
        ALTER TABLE public."AdminContentEvent" ADD CONSTRAINT "AdminContentEvent_action_check" CHECK (action IN ('prepared','failed','applied','discarded','undone','resolve','dismiss','reopen'));`);
        await check(async()=>{const p=await prepare();await client.query('SAVEPOINT before_old_schema');await assert.rejects(core.apply(db,'admin',p),e=>e.code==='23514'&&e.constraint==='AdminContentProposal_field_check');await client.query('ROLLBACK TO SAVEPOINT before_old_schema');assert.equal((await db.query('SELECT "artistId" FROM public."Song" WHERE id=\'s1\'')).rows[0].artistId,'source')});
        const migration=await require('node:fs/promises').readFile(require('node:path').resolve(__dirname,'../prisma/sql/admin-content-actions.sql'),'utf8');
        await db.query(migration);await db.query(migration);
        await check(async()=>{await client.query('SAVEPOINT reject_unknown');await assert.rejects(db.query(`INSERT INTO public."AdminContentProposal" (id,"findingId","subjectId",field,operation,status,data,"actorId") VALUES ('invalid','invalid','source','unknown','merge','applied','{}','admin')`),e=>e.code==='23514');await client.query('ROLLBACK TO SAVEPOINT reject_unknown')});
        await check(async () => { const songs = (await db.query('SELECT * FROM public."Song" ORDER BY id')).rows, p = await prepare(), result = await core.apply(db, 'admin', p); assert.equal(result.moved, 2); assert.equal((await db.query('SELECT count(*)::int AS n FROM public."Artist" WHERE id=\'source\'')).rows[0].n, 0); const after = (await db.query('SELECT * FROM public."Song" ORDER BY id')).rows; assert.deepEqual(after.map(s => Object.fromEntries(Object.entries(s).filter(([key]) => !['artistId', 'slug'].includes(key)))), songs.map(s => Object.fromEntries(Object.entries(s).filter(([key]) => !['artistId', 'slug'].includes(key))))); assert.equal((await db.query('SELECT count(*)::int AS n FROM public."Favorite"')).rows[0].n, 1); assert.equal((await db.query('SELECT count(*)::int AS n FROM public."PlaylistSong"')).rows[0].n, 1); assert.deepEqual((await db.query('SELECT "artistId",position FROM public."SongPerformer" ORDER BY position')).rows, [{ artistId: 'other', position: 0 }, { artistId: 'target', position: 1 }]); const audit = (await db.query('SELECT * FROM public."AdminContentProposal"')).rows[0]; assert.equal(audit.data.before.source.bio, 'Source biography'); assert.equal(audit.data.moves.length, 2); assert.equal(audit.findingId, 'artist-merge:narodne/lexington'); assert.equal((await db.query('SELECT count(*)::int AS n FROM public."AdminContentEvent"')).rows[0].n, 1); });
        await check(async () => { const p = await prepare(); await db.query('UPDATE public."Song" SET lyrics=\'Am\' WHERE id=\'s1\''); await assert.rejects(core.apply(db, 'admin', p), /promenjeni/); assert.equal((await db.query('SELECT count(*)::int AS n FROM public."AdminContentProposal"')).rows[0].n, 0); });
        await check(async () => { const p = await prepare(); await db.query('UPDATE public."User" SET banned=true WHERE id=\'admin\''); await assert.rejects(core.apply(db, 'admin', p), /dozvoljeno/); });
        await check(async () => { const p = await prepare(); await db.query('ALTER TABLE public."AdminContentEvent" ADD CONSTRAINT simulate_failure CHECK (false) NOT VALID'); await client.query('SAVEPOINT mutation'); await assert.rejects(core.apply(db, 'admin', p), /simulate_failure/); await client.query('ROLLBACK TO SAVEPOINT mutation'); assert.equal((await db.query('SELECT "artistId" FROM public."Song" WHERE id=\'s1\'')).rows[0].artistId, 'source'); assert.equal((await db.query('SELECT count(*)::int AS n FROM public."AdminContentProposal"')).rows[0].n, 0); });
        await check(async () => { const p = await prepare(); p.choices = { bio: 'source' }; await core.apply(db, 'admin', p); const row = (await db.query('SELECT a.bio,p."bioSource" FROM public."Artist" a JOIN public."ArtistWikiProfile" p ON p."artistId"=a.id WHERE a.id=\'target\'')).rows[0]; assert.equal(row.bio, 'Source biography'); assert.deepEqual(row.bioSource, { hash: 'source-hash', author: 'Author', revisionId: 42, license: 'CC BY-SA' }); });
        await check(async () => { const p = await prepare(); await core.apply(db, 'admin', p); await assert.rejects(core.apply(db, 'admin', p), /ne postoji/); assert.equal((await db.query('SELECT count(*)::int AS n FROM public."AdminContentProposal"')).rows[0].n, 1); });
        await check(async () => { const p = await prepare(); await db.query('INSERT INTO public."Song" (id,"artistId",slug,title,category,lyrics) VALUES (\'s3\',\'source\',\'new\',\'New\',\'narodne\',\'G\')'); await assert.rejects(core.apply(db, 'admin', p), /promenjeni/); });
        await check(async () => { await db.query('UPDATE public."Artist" SET bio=null,"bioShort"=null WHERE id=\'target\''); const p = await prepare(); await core.apply(db, 'admin', p); assert.equal((await db.query('SELECT bio FROM public."Artist" WHERE id=\'target\'')).rows[0].bio, 'Source biography'); });
        await client.query('ROLLBACK');
        console.log(JSON.stringify({ databaseRegressionCases: checks, allPassed: true, isolatedSchemaRolledBack: true, productionArtistAndSongWrites: 0 }));
    }
    finally {
        try {
            await client.query('ROLLBACK');
        }
        finally {
            await client.end();
        }
    }
}
main().catch(e => { console.error(e.code || e.message); process.exitCode = 1; });
