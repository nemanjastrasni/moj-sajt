/* eslint-disable @typescript-eslint/no-require-imports -- Explicit reviewed maintenance, never part of a request. */
const { hash, requireThat, verifyRedirects } = require('./catalog-maintenance.cjs')
const ignored = new Set(['id', 'slug', 'createdAt', 'popularity'])
const musical = row => Object.fromEntries(Object.entries(row).filter(([key]) => !ignored.has(key)))
const equalContent = (a, b) => ['artistId', 'category', 'title', 'lyrics', 'chords'].every(key => a[key] === b[key])
const identity = row => ({ id: row.id, slug: row.slug, artistId: row.artistId, category: row.category })
const url = (song, artist) => '/pesme/' + [artist.category, artist.slug, song.slug].map(encodeURIComponent).join('/')
function makePlan(snapshot, reviewed = []) {
  const groups = new Map(), pairs = [], skipped = []
  for (const row of snapshot.songs) {
    if (!row.title.trim() || !row.lyrics.trim()) continue
    const key = hash([row.artistId, row.category, row.title, row.lyrics, row.chords])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  const referenced = id => snapshot.references.some(ref => ref.rows.some(row => row[ref.column] === id)) || snapshot.auditIds.includes(id)
  const protectedIds = new Set(reviewed.map(rule => rule.target.id))
  for (const songs of groups.values()) {
    if (songs.length < 2) continue
    const artist = snapshot.artists.find(row => row.id === songs[0].artistId)
    if (!artist || !['domace', 'narodne', 'strane'].includes(artist.category) || !/^[a-z0-9-]+$/.test(artist.slug) || songs.some(row => row.category !== artist.category || !/^[a-z0-9-]+$/.test(row.slug))) {
      skipped.push({ ids: songs.map(row => row.id), reason: 'category' }); continue
    }
    // A hash only finds candidates. Compare the actual unmodified strings as well.
    requireThat(songs.every(row => equalContent(row, songs[0])), 'HASH_COLLISION')
    songs.sort((a, b) => Number(referenced(b.id)) - Number(referenced(a.id)) || Number(protectedIds.has(b.id)) - Number(protectedIds.has(a.id)) || b.popularity - a.popularity || a.slug.length - b.slug.length || a.id.localeCompare(b.id))
    const keep = songs[0]
    for (const remove of songs.slice(1)) {
      const reason = referenced(remove.id) ? 'references' : protectedIds.has(remove.id) ? 'reviewed-target' : hash(musical(keep)) !== hash(musical(remove)) ? 'metadata' : null
      if (reason) { skipped.push({ ids: [keep.id, remove.id], reason }); continue }
      pairs.push({ artist: artist.name, title: keep.title, artistId: artist.id, artistSlug: artist.slug,
        keep: identity(keep), remove: identity(remove), contentHash: hash([keep.title, keep.lyrics, keep.chords]), metadataHash: hash(musical(keep)),
        source: url(remove, artist), destination: url(keep, artist), permanent: true })
    }
  }
  pairs.sort((a, b) => a.source.localeCompare(b.source))
  validateRedirects(pairs)
  return { version: 1, createdAt: new Date().toISOString(), pairs, skipped }
}
function validateRedirects(pairs, existing = []) {
  const all = [...existing, ...pairs], sources = new Set(all.map(row => row.source))
  requireThat(sources.size === all.length, 'DUPLICATE_REDIRECT_SOURCE')
  for (const row of all) {
    const songPath = value => /^\/pesme\/(domace|narodne|strane)\/[a-z0-9-]+\/[a-z0-9-]+$/.test(value)
    requireThat(existing.includes(row) || row.permanent === true && row.source !== row.destination && songPath(row.source) && songPath(row.destination), 'INVALID_REDIRECT')
    requireThat(!sources.has(row.destination), 'REDIRECT_CHAIN_OR_LOOP')
  }
}
function assertPlan(plan, snapshot) {
  requireThat(plan.version === 1 && plan.pairs.length > 0, 'INVALID_PLAN')
  const ids = plan.pairs.map(pair => pair.remove.id)
  requireThat(new Set(ids).size === ids.length, 'DUPLICATE_REMOVAL_ID')
  requireThat(!plan.pairs.some(pair => ids.includes(pair.keep.id)), 'REMOVAL_IS_ALSO_A_TARGET')
  for (const pair of plan.pairs) {
    const keep = snapshot.songs.find(row => row.id === pair.keep.id), remove = snapshot.songs.find(row => row.id === pair.remove.id), artist = snapshot.artists.find(row => row.id === pair.artistId)
    requireThat(keep && remove && artist, 'MISSING_RECORD')
    requireThat(hash(identity(keep)) === hash(pair.keep) && hash(identity(remove)) === hash(pair.remove) && artist.slug === pair.artistSlug && url(remove, artist) === pair.source && url(keep, artist) === pair.destination, 'IDENTITY_CHANGED')
    requireThat(equalContent(keep, remove) && hash([keep.title, keep.lyrics, keep.chords]) === pair.contentHash, 'CONTENT_CHANGED')
    requireThat(hash(musical(keep)) === pair.metadataHash && hash(musical(remove)) === pair.metadataHash, 'METADATA_CHANGED')
    requireThat(!snapshot.references.some(ref => ref.rows.some(row => row[ref.column] === remove.id)) && !snapshot.auditIds.includes(remove.id), 'NEW_REFERENCE')
  }
}
async function removeSongs(db, plan) {
  const result = await db.query('DELETE FROM public."Song" WHERE id=ANY($1::text[])', [plan.pairs.map(pair => pair.remove.id)])
  requireThat(result.rowCount === plan.pairs.length, 'UNEXPECTED_DELETE_COUNT')
}
module.exports = { makePlan, assertPlan, equalContent, musical, validateRedirects, removeSongs, verifyRedirects, hash, requireThat }
