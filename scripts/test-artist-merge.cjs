/* eslint-disable @typescript-eslint/no-require-imports -- Node regression tests. */
const { test } = require('node:test'), assert = require('node:assert/strict'), core = require('./lib/artist-merge.cjs');
const input = { action: 'preview', sourceId: 'source', targetId: 'target', choices: {} };
function fixture() { return { artists: [{ id: 'source', name: 'Lexington', slug: 'lexington', category: 'narodne', bio: 'Old bio', bioShort: 'Short', discography: null, image: null, members: null }, { id: 'target', name: 'Lexington Band', slug: 'lexington-band', category: 'narodne', bio: 'Target bio', bioShort: 'Target short', discography: ['2020 — Album'], image: '/image.webp', members: null }], songs: [{ id: 's1', artistId: 'source', title: 'Same', slug: 'same', category: 'narodne', lyrics: 'E A' }, { id: 's2', artistId: 'source', title: 'Same 2', slug: 'same-2', category: 'narodne', lyrics: 'D G' }, { id: 't1', artistId: 'target', title: 'Same', slug: 'same', category: 'narodne', lyrics: 'E A' }, { id: 't2', artistId: 'target', title: 'Same', slug: 'same-2', category: 'narodne', lyrics: 'E A' }], profiles: [{ artistId: 'source', wikidataId: 'Q1', bioSource: { hash: 'original-hash', revisionId: 42, license: 'CC BY-SA', author: 'Original author' }, discographySource: null }, { artistId: 'target', wikidataId: 'Q1', bioSource: { hash: 'target-hash' }, discographySource: { hash: 'discography-hash' } }], credits: [{ songId: 'duet', artistId: 'other', position: 0 }, { songId: 'duet', artistId: 'source', position: 1 }, { songId: 'duet', artistId: 'target', position: 2 }] }; }
test('merge rejects self, missing selection, invalid action and unconfirmed writes', () => { for (const value of [null, {}, { ...input, targetId: 'source' }, { ...input, action: 'delete' }, { ...input, choices: { slug: 'source' } }, { ...input, action: 'apply', version: 'a'.repeat(64) }])
    assert.throws(() => core.validate(value), core.MergeError); assert.deepEqual(core.validate(input), input); });
test('all songs retained with deterministic unique slugs; target identity stays fixed', () => { const state = fixture(), p = core.plan(state, input); assert.equal(p.moves.length, 2); assert.equal(new Set([...p.targetSongs.map(s => s.slug), ...p.moves.map(s => s.slug)]).size, 4); assert.equal(p.after.name, 'Lexington Band'); assert.equal(p.after.slug, 'lexington-band'); assert.equal(p.after.image, '/image.webp'); assert.deepEqual(p.after.discography, ['2020 — Album']); assert.equal(state.songs[0].artistId, 'source'); });
test('preview contains counts and conflicts, not song lyrics', () => { const p = core.preview(core.plan(fixture(), input)); assert.equal(p.total, 4); assert.equal(p.collisions.length, 2); assert.equal(p.conflicts[0].field, 'bio'); assert.ok(!JSON.stringify(p).includes('lyrics')); });
test('field choice carries its original credits, revisions and hashes without changing them', () => { const state = fixture(), p = core.plan(state, { ...input, choices: { bio: 'source' } }); assert.equal(p.after.bio, 'Old bio'); assert.equal(p.after.bioShort, 'Short'); assert.deepEqual(p.profile.bioSource, state.profiles[0].bioSource); assert.deepEqual(p.profile.discographySource, state.profiles[1].discographySource); });
test('missing data are filled and identical content retains available attribution', () => { const state = fixture(); state.artists[1].bio = state.artists[0].bio; state.profiles[1].bioSource = null; state.artists[1].image = null; state.artists[0].image = '/source.webp'; const p = core.plan(state, input); assert.equal(p.after.image, '/source.webp'); assert.deepEqual(p.profile.bioSource, state.profiles[0].bioSource); });
test('duets deduplicate the same artist without altering the position of other artists', () => { const p = core.plan(fixture(), input); assert.deepEqual(p.performanceMoves, [{ songId: 'duet', position: 1 }]); assert.equal(core.preview(p).creditedSongs, 1); });
test('different categories block merging and different Wikipedia identities require explicit consent', () => { const state = fixture(); state.artists[1].category = 'strane'; assert.throws(() => core.plan(state, input), /kategorij/); state.artists[1].category = 'narodne'; state.profiles[1].wikidataId = 'Q2'; assert.deepEqual(core.preview(core.plan(state,input)).identityConflict,{sourceWikidataId:'Q1',targetWikidataId:'Q2'}); });
test('preview version changes for content, membership, profile or credit changes', () => { const before = core.plan(fixture(), input).version; for (const change of [s => s.songs[0].lyrics = 'Am', s => s.artists[0].name = 'Changed', s => s.profiles[0].bioSource.hash = 'edited', s => s.credits[0].position = 5, s => s.songs.push({ id: 'new', artistId: 'source', slug: 'new' })]) {
    const s = fixture();
    change(s);
    assert.notEqual(core.plan(s, input).version, before);
} });
test('server rejects a revoked admin before reading or writing artists', async () => { let queries = 0; await assert.rejects(core.apply({ query: async () => { queries++; return { rows: [{ role: 'user', banned: false }] }; } }, 'admin', { ...input, action: 'apply', confirmed: true, version: 'a'.repeat(64) }), e => e.status === 403); assert.equal(queries, 1); });
module.exports = { fixture, input };

test('preview refuses an audit that would exceed the existing database size constraint',()=>{const state=fixture();state.artists[0].bio='x'.repeat(220000);assert.throws(()=>core.plan(state,input),e=>e.status===413)});
test('preview version binds the direction of the merge',()=>{const state=fixture();assert.notEqual(core.plan(state,input).version,core.plan(state,{...input,sourceId:input.targetId,targetId:input.sourceId}).version)});

function mergeDatabase(state){const writes=[];return {writes,async query(sql,params){
 if(sql.startsWith('SELECT role'))return{rows:[{role:'admin',banned:false}]};
 if(sql.startsWith('SELECT * FROM public."Artist"'))return{rows:state.artists};
 if(sql.startsWith('SELECT * FROM public."Song"'))return{rows:state.songs};
 if(sql.startsWith('SELECT * FROM public."ArtistWikiProfile"'))return{rows:state.profiles};
 if(sql.startsWith('SELECT p.*'))return{rows:state.credits};
 if(sql.startsWith('SELECT count'))return{rows:[{n:0}]};
 writes.push({sql,params});return{rows:[]};
}}}
test('conflicting Wikidata identities can be previewed but never applied without extra consent',async()=>{
 const state=fixture();state.profiles[1].wikidataId='Q2';const preview=core.preview(core.plan(state,input));
 for(const identityConfirmed of [undefined,false]){const db=mergeDatabase(state);await assert.rejects(core.apply(db,'admin',{...input,action:'apply',confirmed:true,identityConfirmed,version:preview.version}),/Dodatno potvrdi/);assert.equal(db.writes.length,0)}
 for(const identityConfirmed of ['true',1,null])assert.throws(()=>core.validate({...input,identityConfirmed}),/dodatna potvrda/);
});
test('explicit consent permits the merge and is archived with both previous identities',async()=>{
 const state=fixture();state.profiles[1].wikidataId='Q2';const p=core.plan(state,input),db=mergeDatabase(state);
 await core.apply(db,'admin',core.validate({...input,action:'apply',confirmed:true,identityConfirmed:true,version:p.version}));
 const audit=JSON.parse(db.writes.find(w=>w.sql.startsWith('INSERT INTO public."AdminContentProposal"')).params[3]);
 assert.deepEqual(audit.identityOverride,{sourceWikidataId:'Q1',targetWikidataId:'Q2',confirmed:true});
 assert.equal(db.writes.find(w=>w.sql.startsWith('INSERT INTO public."ArtistWikiProfile"')).params[3],'Q2');
 assert.deepEqual(audit.before.profiles,state.profiles);
});
test('consent cannot bypass a changed preview or a changed identity',async()=>{
 const state=fixture();state.profiles[1].wikidataId='Q2';const p=core.plan(state,input);state.profiles[1].wikidataId='Q3';const db=mergeDatabase(state);
 await assert.rejects(core.apply(db,'admin',{...input,action:'apply',confirmed:true,identityConfirmed:true,version:p.version}),/promenjeni/);assert.equal(db.writes.length,0);
});
test('matching or missing identities do not require an extra checkbox',()=>{
 const state=fixture();assert.equal(core.preview(core.plan(state,input)).identityConflict,null);state.profiles.pop();assert.equal(core.preview(core.plan(state,input)).identityConflict,null);
});
