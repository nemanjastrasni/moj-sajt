/* eslint-disable @typescript-eslint/no-require-imports -- Exact-content and transactional safety regressions. */
const { test } = require('node:test'), assert = require('node:assert/strict'), core = require('./lib/exact-song-duplicates.cjs')
function fixture() {
  const row = { artistId: 'artist', title: 'Same song', category: 'domace', lyrics: 'Am\nSame words', chords: null, musicAssessment: { difficulty: 'beginner' }, difficulty: 'beginner', popularity: 2, createdAt: '2026-01-01 00:00:00.123456' }
  return { artists: [{ id: 'artist', name: 'Artist', slug: 'artist', category: 'domace' }], songs: [{ ...row, id: 'one', slug: 'same-song' }, { ...structuredClone(row), id: 'two', slug: 'artist-same-song', popularity: 1 }], references: [], auditIds: [] }
}
test('only exact unchanged strings under the same artist/category are candidates; hashes are not the proof', () => {
  const data = fixture(), before = structuredClone(data), plan = core.makePlan(data)
  assert.equal(plan.pairs.length, 1); assert.equal(plan.pairs[0].keep.id, 'one'); assert.equal(plan.pairs[0].remove.id, 'two')
  assert.deepEqual(data, before); core.assertPlan(plan, data)
  for (const [key, value] of [['title', 'same song'], ['lyrics', 'Am\nSame words '], ['chords', ''], ['artistId', 'another'], ['category', 'strane']]) {
    const changed = fixture(); changed.songs[1][key] = value; assert.equal(core.makePlan(changed).pairs.length, 0)
  }
  const unicode = fixture(); unicode.songs[0].lyrics = 'č'; unicode.songs[1].lyrics = 'c\u030c'; assert.equal(core.makePlan(unicode).pairs.length, 0)
})
test('referenced IDs stay; if both are referenced or metadata differs, skip instead of losing settings', () => {
  for (const table of ['PlaylistSong', 'Favorite', 'SongReview', 'SongTutorial', 'SongReport', 'SongPerformer', 'UnknownFutureRelation']) {
    const data = fixture(); data.references = [{ table, column: 'songId', rows: [{ songId: 'two' }] }]
    const plan = core.makePlan(data); assert.equal(plan.pairs[0].keep.id, 'two'); assert.equal(plan.pairs[0].remove.id, 'one')
    data.references[0].rows.push({ songId: 'one' }); assert.equal(core.makePlan(data).pairs.length, 0)
  }
  const audit = fixture(); audit.auditIds = ['two']; assert.equal(core.makePlan(audit).pairs[0].keep.id, 'two')
  const metadata = fixture(); metadata.songs[1].difficulty = 'advanced'; assert.equal(core.makePlan(metadata).pairs.length, 0)
  const blank = fixture(); blank.songs.forEach(row => { row.lyrics = '   ' }); assert.equal(core.makePlan(blank).pairs.length, 0)
})
test('a reviewed canonical target stays; changed content, URLs, metadata or new dependencies abort stale apply', () => {
  const data = fixture(), plan = core.makePlan(data, [{ target: { id: 'two' } }]); assert.equal(plan.pairs[0].keep.id, 'two')
  for (const change of [s => { s.songs[0].lyrics += '.' }, s => { s.songs[1].slug = 'renamed' }, s => { s.artists[0].slug = 'renamed' }, s => { s.songs[0].difficulty = 'advanced' }, s => { s.auditIds.push('one') }, s => { s.references.push({ table: 'NewRelation', column: 'songId', rows: [{ songId: 'one' }] }) }]) {
    const changed = fixture(); change(changed); assert.throws(() => core.assertPlan(plan, changed))
  }
})
test('the committed redirect list matches the reviewed IDs and has no conflicts, chains, patterns or loops', () => {
  const plan = require('./data/exact-song-duplicates-2026-11-16.json'), redirects = require('../lib/seo/exact-song-redirects.json'), legacy = require('../lib/seo/legacy-redirects.json')
  assert.equal(plan.pairs.length, 299); assert.deepEqual(redirects, plan.pairs.map(({ source, destination, permanent }) => ({ source, destination, permanent })))
  core.validateRedirects(plan.pairs, legacy)
  assert.equal(new Set(plan.pairs.map(pair => pair.remove.id)).size, plan.pairs.length)
  assert.ok(!plan.pairs.some(pair => plan.pairs.some(other => pair.keep.id === other.remove.id)))
  for (const invalid of [[...redirects, redirects[0]], [{ ...redirects[0], destination: redirects[0].source }], [{ ...redirects[0], source: '/pesme/domace/artist/:slug' }], [{ ...redirects[0], destination: 'https://other.example' }]]) assert.throws(() => core.validateRedirects(invalid))
  const config = require('node:fs').readFileSync(require('node:path').join(__dirname, '../next.config.ts'), 'utf8'); assert.match(config, /\.\.\.exactSongRedirects/)
})
test('cleanup cannot pass a missing, temporary, off-origin or query-dropping redirect', async () => {
  const pair = core.makePlan(fixture()).pairs[0]
  const good = async url => url.pathname === pair.source ? new Response(null, { status: 308, headers: { location: pair.destination + url.search } }) : new Response(null, { status: 200 })
  assert.equal((await core.verifyRedirects('https://site.example', good, [pair])).checked, 1)
  for (const bad of [async () => new Response(null, { status: 200 }), async () => new Response(null, { status: 307, headers: { location: pair.destination } }), async () => new Response(null, { status: 308, headers: { location: pair.destination } }), async () => new Response(null, { status: 308, headers: { location: 'https://other.example' + pair.destination } })]) await assert.rejects(core.verifyRedirects('https://site.example', bad, [pair]))
})
test('real PostgreSQL: delete affects only an unreferenced duplicate, rollback restores it; a new cascading FK blocks planning', { skip: !process.env.DEDUPE_PGLITE_MODULE }, async () => {
  const { PGlite } = require(process.env.DEDUPE_PGLITE_MODULE), pg = new PGlite(), { load } = require('./exact-song-duplicates.cjs')
  const db = { query: async (sql, args) => { const result = await pg.query(sql, args); return { ...result, rowCount: result.affectedRows } } }
  try {
    await pg.exec(`CREATE TABLE public."Artist" (id text PRIMARY KEY,name text,slug text,category text);
      CREATE TABLE public."Song" (id text PRIMARY KEY,"artistId" text REFERENCES public."Artist",slug text,title text,category text,lyrics text,chords text,difficulty text,"musicAssessment" jsonb,popularity int,"createdAt" timestamp,UNIQUE("artistId",slug));
      CREATE TABLE public."PlaylistSong" (id text PRIMARY KEY,"songId" text REFERENCES public."Song",transpose int,capo int);
      CREATE TABLE public."UnexpectedRelation" ("songId" text REFERENCES public."Song" ON DELETE CASCADE);
      CREATE TABLE public."AdminContentProposal" ("subjectId" text,data jsonb);
      INSERT INTO public."Artist" VALUES ('artist','Artist','artist','domace')`)
    const data = fixture()
    for (const row of data.songs) await db.query('INSERT INTO public."Song" SELECT * FROM jsonb_populate_record(NULL::public."Song",$1::jsonb)', [JSON.stringify(row)])
    await pg.exec(`INSERT INTO public."PlaylistSong" VALUES ('list-entry','two',3,2)`)
    const before = await load(db), plan = core.makePlan(before)
    assert.equal(plan.pairs.length, 1); assert.equal(plan.pairs[0].keep.id, 'two'); core.assertPlan(plan, before)
    await pg.exec('BEGIN'); await core.removeSongs(db, plan)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public."Song"')).rows[0].n, 1)
    assert.deepEqual((await db.query('SELECT * FROM public."PlaylistSong"')).rows, [{ id: 'list-entry', songId: 'two', transpose: 3, capo: 2 }])
    await pg.exec('ROLLBACK')
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public."Song"')).rows[0].n, 2)
    await pg.exec(`INSERT INTO public."UnexpectedRelation" VALUES ('one')`)
    const changed = await load(db); assert.throws(() => core.assertPlan(plan, changed), /NEW_REFERENCE/); assert.equal(core.makePlan(changed).pairs.length, 0)
    await pg.exec('DELETE FROM public."UnexpectedRelation"'); await pg.exec(`INSERT INTO public."AdminContentProposal" VALUES ('artist','{"moves":[{"id":"one"}]}')`)
    assert.equal(core.makePlan(await load(db)).pairs.length, 0)
  } finally { await pg.close() }
})
