/* eslint-disable @typescript-eslint/no-require-imports -- Read-only public catalog audit with verified TLS. */
const { parseArgs } = require('node:util')
const path = require('node:path')
const { values } = parseArgs({ options: { ca: { type: 'string' } } })
async function main() {
  if (!values.ca) throw Error('Provide --ca with the Supabase CA certificate.')
  require('@next/env').loadEnvConfig(path.join(__dirname, '..'))
  const db = await require('./lib/artist-image-source.cjs').databaseClient(values.ca)
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const categories = ['narodne', 'domace', 'strane']
    const songs = await db.query('SELECT count(*)::int AS total FROM public."Song" s JOIN public."Artist" a ON a.id=s."artistId" WHERE a.category=ANY($1::text[]) AND s.lyrics <> $2', [categories, ''])
    const artists = await db.query('SELECT count(*)::int AS total FROM public."Artist" WHERE category=ANY($1::text[])', [categories])
    const invalid = await db.query('SELECT count(*)::int AS total FROM public."Song" s JOIN public."Artist" a ON a.id=s."artistId" WHERE a.category=ANY($1::text[]) AND (btrim(s.slug)=$2 OR btrim(a.slug)=$2 OR s.slug IN ($3,$4) OR a.slug IN ($3,$4))', [categories, '', '.', '..'])
    const performers = await db.query('SELECT count(*)::int AS total FROM public."SongPerformer"')
    const invalidRows = await db.query('SELECT s.id,s.title,s.slug,a.name AS artist,a.slug AS "artistSlug",a.category FROM public."Song" s JOIN public."Artist" a ON a.id=s."artistId" WHERE a.category=ANY($1::text[]) AND (btrim(s.slug)=$2 OR btrim(a.slug)=$2 OR s.slug IN ($3,$4) OR a.slug IN ($3,$4)) LIMIT 5', [categories, '', '.', '..'])
    await db.query('ROLLBACK')
    console.log(JSON.stringify({ readOnly: true, candidateSongs: songs.rows[0].total, eligibleArtists: artists.rows[0].total, invalidPublicPaths: invalid.rows[0].total, invalidRows: invalidRows.rows, performerLinks: performers.rows[0].total, songSitemapBatches: Math.ceil(songs.rows[0].total / 1000), artistSitemapBatches: Math.ceil(artists.rows[0].total / 1000) }))
    if (invalid.rows[0].total) process.exitCode = 1
  } finally { await db.end() }
}
main().catch(error => { console.error(error.code || error.name); process.exitCode = 1 })
