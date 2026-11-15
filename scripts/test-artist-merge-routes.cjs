/* eslint-disable @typescript-eslint/no-require-imports -- Isolated route and transaction boundaries. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', jsx: 'react-jsx' } });
const { test, beforeEach } = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path'), { Prisma } = require('@prisma/client');
let allowed, originOK, refreshes, output, requests, records, song, target, rawReads, txAttempts, serializationFailures, committed;
const prisma = {
    $queryRawUnsafe: async (sql, key) => { rawReads++; return records[key] ? [records[key]] : []; },
    artist: { findUnique: async () => target }, song: { findUnique: async () => song },
    $transaction: async (work, options) => { txAttempts++; assert.equal(options.isolationLevel, 'Serializable'); if (serializationFailures-- > 0)
        throw new Prisma.PrismaClientKnownRequestError('retry', { code: 'P2034', clientVersion: 'test' }); return work({}); },
};
const original = Module._load;
Module._load = function (request, parent, main) {
    if (request === '@/lib/prisma')
        return { prisma };
    if (request === '@/lib/adminSongs/server')
        return { requireSongAdmin: async () => { if (!allowed)
                throw Object.assign(Error('forbidden'), { status: 403 }); return { id: 'admin' }; }, adminSongBody: async (req) => { if (!originOK)
                throw Object.assign(Error('origin'), { status: 403 }); return req.json(); }, adminSongFailure: e => Response.json({ error: e.message }, { status: e.status || 503 }) };
    if (request === '@/lib/adminContent/server')
        return { refreshArtistContent: (...args) => refreshes.push(args) };
    if (request === '@/lib/adminContent/merge')
        return { mergeArtists: async (...args) => { requests.push(args); return output; } };
    if (request === 'react') {
        return { ...original.call(this, request, parent, main), cache: f => f };
    }
    if (request === 'next/navigation')
        return { permanentRedirect: href => { throw Object.assign(Error('redirect'), { href, status: 308 }); } };
    if (request === '@/scripts/lib/artist-merge.cjs')
        return { validate: x => x, load: async () => ({}), plan: () => ({}), preview: () => ({ version: 'v' }), apply: async () => { committed++; return { target: { id: 'target' } }; } };
    if (request.startsWith('@/'))
        request = path.join(__dirname, '..', request.slice(2));
    return original.call(this, request, parent, main);
};
let route, redirects, service;
try {
    route = require('../app/api/admin/artists/merge/route.ts');
    redirects = require('../lib/artists/mergeRedirect.ts');
    service = require('../lib/adminContent/merge.ts');
}
finally {
    Module._load = original;
}
beforeEach(() => { allowed = true; originOK = true; refreshes = []; requests = []; output = { preview: { version: 'v' } }; records = {}; song = null; target = null; rawReads = 0; txAttempts = 0; serializationFailures = 0; committed = 0; });
const post = () => route.POST(new Request('https://example.com/api/admin/artists/merge', { method: 'POST', body: '{"action":"preview"}' }));
test('preview is private and performs no cache invalidation; apply refreshes both artists', async () => { let r = await post(); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'private, no-store'); assert.equal(refreshes.length, 0); output = { result: { source: { slug: 'old' }, target: { slug: 'new' } } }; r = await post(); assert.equal(r.status, 200); assert.deepEqual(refreshes, [[output.result.source, output.result.target]]); });
test('anonymous or cross-origin requests never reach the merge service', async () => { allowed = false; assert.equal((await post()).status, 403); allowed = true; originOK = false; assert.equal((await post()).status, 403); assert.equal(requests.length, 0); });
test('serialization retry commits exactly once and carries explicit transaction isolation', async () => { serializationFailures = 2; await service.mergeArtists('admin', { action: 'apply' }); assert.equal(txAttempts, 3); assert.equal(committed, 1); });
test('unknown slugs remain 404 candidates; invalid categories never query merge history', async () => { assert.equal(await redirects.mergedArtistHref('narodne', 'missing'), null); assert.equal(rawReads, 1); assert.equal(await redirects.mergedArtistHref('private', 'anything'), null); assert.equal(rawReads, 1); });
test('old song links follow the song ID after collision renaming and future artist moves', async () => { records['artist-merge:narodne/lexington'] = { subjectId: 'target', target: { category: 'narodne', slug: 'lexington-band' }, moves: [{ id: 'song', oldSlug: 'same' }] }; song = { slug: 'same-2', artist: { category: 'narodne', slug: 'lexington-band' } }; assert.equal(await redirects.mergedArtistHref('narodne', 'lexington', 'song', 'same'), '/pesme/narodne/lexington-band/same-2'); assert.equal(await redirects.mergedArtistHref('narodne', 'lexington', 'song', 'unknown'), null); await assert.rejects(redirects.redirectMergedArtist('narodne', 'lexington', 'song', 'same'), e => e.status === 308); });
test('artist, biography and info links follow repeated merges, with cycle protection', async () => { records['artist-merge:narodne/lexington'] = { subjectId: 'target', target: { category: 'narodne', slug: 'lexington-band' }, moves: [] }; target = { category: 'narodne', slug: 'lexington-band' }; assert.equal(await redirects.mergedArtistHref('narodne', 'lexington', 'bio'), '/biografija/narodne/lexington-band'); assert.equal(await redirects.mergedArtistHref('narodne', 'lexington', 'info'), '/pesme/narodne/lexington-band/info'); target = null; records['artist-merge:narodne/lexington-band'] = records['artist-merge:narodne/lexington']; assert.equal(await redirects.mergedArtistHref('narodne', 'lexington'), null); });
test('old song redirects retain playlist and player query parameters', async () => { records['artist-merge:narodne/lexington'] = { subjectId: 'target', target: { category: 'narodne', slug: 'lexington-band' }, moves: [{ id: 'song', oldSlug: 'same' }] }; song = { slug: 'same-2', artist: { category: 'narodne', slug: 'lexington-band' } }; await assert.rejects(redirects.redirectMergedArtist('narodne', 'lexington', 'song', 'same', { playlist: '/plejliste/list', play: '1' }), e => e.href === '/pesme/narodne/lexington-band/same-2?playlist=%2Fplejliste%2Flist&play=1'); });
