/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in PostgreSQL regression transaction, always rolled back. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const repo=path.resolve(__dirname,'..'),stage=repo;
const {values}=require('node:util').parseArgs({options:{ca:{type:'string'}}});
require(repo+'/node_modules/@next/env').loadEnvConfig(repo,false,{info(){},error(){}});
require(repo+'/node_modules/ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}});
const {assessmentSourceHash,assessSong,assessmentUpdate}=require(stage+'/lib/music/assessment.ts');
(async()=>{
 const db=await require(repo+'/scripts/lib/artist-image-source.cjs').databaseClient(values.ca);
 const schema='qa_assessment_'+randomUUID().replaceAll('-',''),q='"'+schema+'"';
 let checks=0;
 const one=async(sql,values)=>(await db.query(sql,values)).rows[0];
 try{
  await db.query('BEGIN');await db.query('CREATE SCHEMA '+q);
  await db.query('CREATE TABLE '+q+'."Song" (id text PRIMARY KEY,lyrics text NOT NULL,chords text,title text,popularity integer DEFAULT 0)');
  await db.query(fs.readFileSync(stage+'/prisma/song-assessments.sql','utf8').replaceAll('public.',q+'.'));
  for(const lyrics of ['', 'ć č đ š ž\nC G Am','A😀B','null'])for(const chords of [null,'','C\r\nAm','č😀']){
   assert.equal((await one('SELECT '+q+'.song_assessment_hash($1,$2) hash',[lyrics,chords])).hash,assessmentSourceHash({lyrics,chords}));checks++;
  }
  const source={lyrics:'C G Am\nć č đ š ž',chords:null};const assessment=assessSong(source);
  await db.query('INSERT INTO '+q+'."Song" (id,lyrics,chords,"musicAssessment") VALUES ($1,$2,$3,$4)', ['qa',source.lyrics,null,assessment]);
  assert.deepEqual((await one('SELECT "musicAssessment" a FROM '+q+'."Song"')).a,assessment);checks++;
  await db.query('UPDATE '+q+'."Song" SET title=\'changed\',popularity=4');
  assert.deepEqual((await one('SELECT "musicAssessment" a FROM '+q+'."Song"')).a,assessment);checks++;
  await db.query('UPDATE '+q+'."Song" SET lyrics=\'F#m Bm E\'');
  assert.equal((await one('SELECT "musicAssessment" a FROM '+q+'."Song"')).a,null);checks++;
  const fresh={lyrics:'F#m Bm E',chords:null},update=assessmentUpdate('qa',fresh);
  assert.equal((await db.query(update.text.replaceAll('public.',q+'.'),update.values)).rowCount,1);
  assert.deepEqual((await one('SELECT "musicAssessment" a FROM '+q+'."Song"')).a,assessSong(fresh));checks++;
  await db.query('UPDATE '+q+'."Song" SET "musicAssessment"=$1',[assessment]);
  assert.equal((await one('SELECT "musicAssessment" a FROM '+q+'."Song"')).a,null);checks++;
  for(const invalid of [{},{...assessment,chords:1},{...assessment,chords:[5]},{...assessment,level:null},{...assessment,version:'wrong'},{...assessment,level:'wrong'}]){
   await db.query('SAVEPOINT invalid');await assert.rejects(db.query('UPDATE '+q+'."Song" SET "musicAssessment"=$1',[invalid]),e=>e.code==='23514');await db.query('ROLLBACK TO invalid');checks++;
  }
  assert.equal((await db.query(update.text.replaceAll('public.',q+'.'),[''+JSON.stringify(assessSong(fresh)),'qa','concurrent change',null])).rowCount,0);checks++;
  console.log(JSON.stringify({checks,transaction:'rolled back',productionSongsChanged:0}));
 }finally{await db.query('ROLLBACK');await db.end();}
})().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
