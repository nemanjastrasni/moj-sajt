/* eslint-disable @typescript-eslint/no-require-imports -- Shared CommonJS core used by Next.js and PostgreSQL regression tests. */
const { createHash, randomUUID } = require('node:crypto');
const { stableStringify } = require('../../lib/wiki-values.cjs');
class MergeError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
const fail = (ok, status, message) => { if (!ok)
    throw new MergeError(status, message); };
const hash = value => createHash('sha256').update(stableStringify(value)).digest('hex');
const fields = ['bio', 'discography', 'image', 'members'];
const empty = value => value == null || typeof value === 'string' && !value.trim() || Array.isArray(value) && !value.length;
const json = value => value == null ? null : JSON.stringify(value);
function validate(input) {
    fail(input && typeof input === 'object' && !Array.isArray(input), 400, 'Neispravan zahtev.');
    for (const key of ['sourceId', 'targetId'])
        fail(typeof input[key] === 'string' && /^[a-zA-Z0-9_-]{1,180}$/.test(input[key]), 400, 'Označi dva izvođača.');
    fail(input.sourceId !== input.targetId, 400, 'Izaberi dva različita izvođača.');
    fail(input.action === 'preview' || input.action === 'apply', 400, 'Nepoznata akcija.');
    const choices = input.choices ?? {};
    fail(choices && typeof choices === 'object' && !Array.isArray(choices), 400, 'Neispravan izbor podataka.');
    for (const [key, value] of Object.entries(choices))
        fail(fields.includes(key) && ['source', 'target'].includes(value), 400, 'Neispravan izbor podataka.');
    if (input.identityConfirmed !== undefined)
        fail(typeof input.identityConfirmed === 'boolean', 400, 'Neispravna dodatna potvrda izvođača.');
    if (input.action === 'apply')
        fail(input.confirmed === true && typeof input.version === 'string' && /^[a-f0-9]{64}$/.test(input.version), 400, 'Prvo pregledaj i potvrdi spajanje.');
    return { ...input, choices };
}
async function load(db, input, lock = false) {
    const ids = [input.sourceId, input.targetId].sort(), suffix = lock ? ' FOR UPDATE' : '';
    const artists = (await db.query('SELECT * FROM public."Artist" WHERE id=ANY($1::text[]) ORDER BY id' + suffix, [ids])).rows;
    fail(artists.length === 2, 409, 'Jedan od izvođača više ne postoji. Osveži listu.');
    const songs = (await db.query('SELECT * FROM public."Song" WHERE "artistId"=ANY($1::text[]) ORDER BY id' + suffix, [ids])).rows;
    fail(songs.length <= 5000, 409, 'Za više od 5.000 pesama potrebna je posebna provera spajanja.');
    const profiles = (await db.query('SELECT * FROM public."ArtistWikiProfile" WHERE "artistId"=ANY($1::text[]) ORDER BY "artistId"' + suffix, [ids])).rows;
    // Include other credited artists on affected songs so their order cannot be changed unnoticed.
    const credits = (await db.query('SELECT p.* FROM public."SongPerformer" p WHERE p."songId" IN (SELECT "songId" FROM public."SongPerformer" WHERE "artistId"=ANY($1::text[])) OR p."songId" IN (SELECT id FROM public."Song" WHERE "artistId"=ANY($1::text[])) ORDER BY p."songId",p.position' + suffix, [ids])).rows;
    return { artists, songs, profiles, credits };
}
function plan(state, input) {
    const source = state.artists.find(a => a.id === input.sourceId), target = state.artists.find(a => a.id === input.targetId);
    fail(source && target && source.id !== target.id, 400, 'Izaberi dva različita izvođača.');
    fail(source.category && source.category === target.category, 409, 'Spajanje je dostupno za izvođače iz iste kategorije. Prvo proveri njihove kategorije.');
    const sourceProfile = state.profiles.find(p => p.artistId === source.id), targetProfile = state.profiles.find(p => p.artistId === target.id);
    const identityConflict = sourceProfile?.wikidataId && targetProfile?.wikidataId && sourceProfile.wikidataId !== targetProfile.wikidataId
        ? { sourceWikidataId: sourceProfile.wikidataId, targetWikidataId: targetProfile.wikidataId } : null;
    const choices = {}, conflicts = [], copied = [], after = { ...target };
    for (const key of fields) {
        const different = !empty(source[key]) && !empty(target[key]) && hash(source[key]) !== hash(target[key]);
        if (different)
            conflicts.push({ field: key, source: source[key], target: target[key] });
        choices[key] = empty(source[key]) ? 'target' : empty(target[key]) ? 'source' : input.choices?.[key] ?? 'target';
        if (choices[key] === 'source') {
            after[key] = source[key];
            copied.push(key);
        }
    }
    // A short biography belongs to the selected full biography.
    if (choices.bio === 'source')
        after.bioShort = source.bioShort;
    else if (empty(target.bio) && empty(target.bioShort) && !empty(source.bioShort)) {
        after.bioShort = source.bioShort;
        copied.push('bioShort');
    }
    const sourceSongs = state.songs.filter(s => s.artistId === source.id), targetSongs = state.songs.filter(s => s.artistId === target.id);
    const used = new Set(targetSongs.map(s => s.slug));
    const moves = sourceSongs.map(song => { let slug = song.slug, suffix = 2; while (used.has(slug))
        slug = song.slug + '-' + suffix++; used.add(slug); return { id: song.id, title: song.title, oldSlug: song.slug, slug, category: song.category }; });
    const affected = new Set(state.credits.filter(p => p.artistId === source.id).map(p => p.songId));
    const performanceMoves = [...affected].map(songId => { const positions = state.credits.filter(p => p.songId === songId && [source.id, target.id].includes(p.artistId)).map(p => p.position); return { songId, position: Math.min(...positions) }; });
    let profile = null;
    if (sourceProfile || targetProfile) {
        const base = targetProfile ?? sourceProfile;
        profile = { ...base, artistId: target.id, artistName: target.name, slug: target.slug, wikidataId: targetProfile?.wikidataId ?? sourceProfile?.wikidataId ?? null };
        for (const [field, credit] of [['bio', 'bioSource'], ['discography', 'discographySource']]) {
            const selected = choices[field] === 'source' ? sourceProfile : targetProfile;
            profile[credit] = selected?.[credit] ?? null;
            // Identical content can keep the available original attribution, unchanged.
            if (!profile[credit] && hash(source[field]) === hash(target[field]))
                profile[credit] = sourceProfile?.[credit] ?? targetProfile?.[credit] ?? null;
        }
    }
    const result = { source, target, sourceSongs, targetSongs, moves, performanceMoves, after, profile, choices, conflicts, copied, identityConflict, version: hash({state,sourceId:input.sourceId,targetId:input.targetId}) };
    fail(Buffer.byteLength(JSON.stringify(auditData(state,result)), 'utf8') < 200000, 413, 'Podaci za evidenciju ovog spajanja su preveliki. Potrebna je posebna provera; ništa nije izmenjeno.');
    return result;
}
function auditData(state,p) { return { identity: { name: p.target.name, slug: p.target.slug, category: p.target.category }, before: { source: p.source, target: p.target, profiles: state.profiles, credits: state.credits }, moves: p.moves, choices: p.choices, after: p.after, ...(p.identityConflict ? { identityOverride: { ...p.identityConflict, confirmed: true } } : {}), note: 'Spajanje izvođača; pesme zadržavaju svoje ID vrednosti. Automatsko poništavanje nije podržano.' }; }
function preview(p) { return { version: p.version, source: { id: p.source.id, name: p.source.name, songs: p.sourceSongs.length }, target: { id: p.target.id, name: p.target.name, songs: p.targetSongs.length }, total: p.moves.length + p.targetSongs.length, collisions: p.moves.filter(s => s.slug !==s.oldSlug), creditedSongs: p.performanceMoves.length, choices: p.choices, conflicts: p.conflicts, copied: p.copied, identityConflict: p.identityConflict }; }
async function apply(db, actorId, input) {
    const actor = (await db.query('SELECT role,banned FROM public."User" WHERE id=$1 FOR SHARE', [actorId])).rows[0];
    fail(actor?.role === 'admin' && !actor.banned, 403, 'Nije dozvoljeno.');
    const state = await load(db, input, true), p = plan(state, input);
    fail(input.confirmed === true && input.version === p.version, 409, 'Podaci su u međuvremenu promenjeni. Ponovo pregledaj spajanje.');
    fail(!p.identityConflict || input.identityConfirmed === true, 409, 'Izvori imaju različite Wikidata oznake. Dodatno potvrdi da je ovo isti izvođač.');
    const auditId = randomUUID(), data = auditData(state,p);
    // Audit, redirects and content are committed together. The complete old metadata is retained.
    await db.query('INSERT INTO public."AdminContentProposal" (id,"findingId","subjectId",field,operation,status,data,"actorId") VALUES ($1,$2,$3,\'artist-merge\',\'merge\',\'applied\',$4::jsonb,$5)', [auditId, 'artist-merge:' + p.source.category + '/' + p.source.slug, p.target.id, JSON.stringify(data), actorId]);
    await db.query('UPDATE public."Artist" SET bio=$2,"bioShort"=$3,discography=$4::jsonb,image=$5,members=$6::jsonb WHERE id=$1', [p.target.id, p.after.bio, p.after.bioShort, json(p.after.discography), p.after.image, json(p.after.members)]);
    for (const move of p.moves)
        await db.query('UPDATE public."Song" SET "artistId"=$2,slug=$3 WHERE id=$1', [move.id, p.target.id, move.slug]);
    for (const move of p.performanceMoves) {
        await db.query('DELETE FROM public."SongPerformer" WHERE "songId"=$1 AND "artistId"=ANY($2::text[])', [move.songId, [p.source.id, p.target.id]]);
        await db.query('INSERT INTO public."SongPerformer" ("songId","artistId",position) VALUES ($1,$2,$3)', [move.songId, p.target.id, move.position]);
    }
    if (p.profile)
        await db.query('INSERT INTO public."ArtistWikiProfile" ("artistId","artistName",slug,"wikidataId",state,"bioSource","discographySource","checkedAt") VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) ON CONFLICT ("artistId") DO UPDATE SET "artistName"=EXCLUDED."artistName",slug=EXCLUDED.slug,"wikidataId"=EXCLUDED."wikidataId",state=EXCLUDED.state,"bioSource"=EXCLUDED."bioSource","discographySource"=EXCLUDED."discographySource","checkedAt"=EXCLUDED."checkedAt"', [p.target.id, p.target.name, p.target.slug, p.profile.wikidataId, p.profile.state, json(p.profile.bioSource), json(p.profile.discographySource), p.profile.checkedAt]);
    const remaining = (await db.query('SELECT count(*)::int AS n FROM public."Song" WHERE "artistId"=$1', [p.source.id])).rows[0].n;
    fail(remaining === 0, 409, 'Nisu prenete sve pesme. Spajanje je zaustavljeno.');
    await db.query('DELETE FROM public."Artist" WHERE id=$1', [p.source.id]);
    await db.query('INSERT INTO public."AdminContentEvent" (id,"proposalId",action,"actorId") VALUES ($1,$2,\'merge\',$3)', [randomUUID(), auditId, actorId]);
    return { source: p.source, target: p.target, moved: p.moves.length, auditId };
}
module.exports = { MergeError, validate, load, plan, preview, apply };
