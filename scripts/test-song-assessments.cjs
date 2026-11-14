/* eslint-disable @typescript-eslint/no-require-imports -- Pure assessment/version tests. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto')
const {assessSong,assessmentSourceHash,persistSongAssessment}=require('../lib/music/assessment.ts')
const {storedAssessment}=require('../lib/music/storedAssessment.ts'),{estimateDifficulty}=require('../lib/music/difficulty.ts')
test('persisted values preserve the existing algorithm including null and unicode content',()=>{
 for(const lyrics of ['C G Am','F#m Bm E','E(#9) A7','ć č đ š ž','', 'C7 G7\n😀'])for(const chords of [null,'','Am Dm']){
  const song={lyrics,chords},row=assessSong(song)
  assert.deepEqual({level:row.level,chords:row.chords},estimateDifficulty(song));assert.deepEqual(storedAssessment(row),row)
 }
 assert.notEqual(assessmentSourceHash({lyrics:'',chords:null}),assessmentSourceHash({lyrics:'',chords:''}))
 assert.equal(assessmentSourceHash({lyrics:'ć',chords:'G'}),createHash('sha256').update(Buffer.concat([Buffer.from('ć'),Buffer.from([0,1]),Buffer.from('G')])).digest('hex'))
})
test('invalid, missing and outdated stored values fall back instead of using stale results',()=>{
 const row=assessSong({lyrics:'C G Am',chords:null})
 for(const invalid of [null,{},[],{...row,version:'old'},{...row,sourceHash:'bad'},{...row,chords:[42]},{...row,level:null},{...row,level:'beginner'}])assert.equal(storedAssessment(invalid),undefined)
})
test('assessment persistence is parameterized and fails atomically on concurrent changes',async()=>{
 const source={lyrics:"C G Am\n' quoted ć",chords:null},id="song';--"
 await persistSongAssessment({$executeRaw:async query=>{assert.deepEqual(query.values,[JSON.stringify(assessSong(source)),id,source.lyrics,null]);assert.doesNotMatch(query.text,/quoted|song';--/);return 1}},id,source)
 await assert.rejects(persistSongAssessment({$executeRaw:async()=>0},id,source),/changed/)
 await assert.rejects(persistSongAssessment({$executeRaw:async()=>{throw Error('db failure')}},id,source),/db failure/)
})
test('offline build verifies the music parser revision',async()=>{
 assert.equal((await require('./song-assessments.cjs').checkVersion()).valid,true)
})
