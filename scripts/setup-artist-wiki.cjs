/* eslint-disable @typescript-eslint/no-require-imports -- Explicit additive schema setup. */
const path = require('node:path')
const { parseArgs } = require('node:util')
const { databaseClient } = require('./lib/artist-image-source.cjs')
const { setup, saveProfile } = require('./lib/artist-wiki-store.cjs')
async function main() {
  const { values } = parseArgs({ options: { ca: { type: 'string' } } })
  require('@next/env').loadEnvConfig(path.resolve(__dirname,'..'))
  const db = await databaseClient(values.ca)
  try {
    await db.query('BEGIN'); await setup(db)
    const rows = (await db.query('SELECT id,name,slug,bio,discography FROM public."Artist"')).rows
    const manifest = require('../public/artist-wiki/manifest.json')
    const { hash } = require('./lib/artist-wiki-store.cjs')
    let imported = 0
    for (const source of manifest.artists) {
      const artist = rows.find(a=>a.id===source.artistId && a.name===source.artistName && a.slug===source.slug)
      if (!artist) continue
      const sources = {}
      for (const field of ['bio','discography']) if (source[field]?.hash === hash(artist[field])) sources[field]=source[field]
      if (!Object.keys(sources).length) continue
      await saveProfile(db,artist,{wikidataId:source.wikidataId,state:'imported'},sources); imported++
    }
    await db.query('COMMIT'); console.log(JSON.stringify({schemaReady:true,existingCreditsImported:imported}))
  } catch(e) { await db.query('ROLLBACK').catch(()=>{}); throw e } finally { await db.end() }
}
main().catch(e=>{console.error(e.code||e.name);process.exitCode=1})
