/* eslint-disable @typescript-eslint/no-require-imports -- Additive metadata setup and backfill. */
const path=require('node:path'),{parseArgs}=require('node:util')
const {databaseClient}=require('./lib/artist-image-source.cjs'),{setup,metadata}=require('./lib/youtube-metadata.cjs')
const ROOT=path.resolve(__dirname,'..')
async function main(){
  const {values}=parseArgs({options:{ca:{type:'string'},backfill:{type:'boolean',default:false}}})
  require('@next/env').loadEnvConfig(ROOT)
  const db=await databaseClient(values.ca)
  try{
    await db.query('BEGIN')
    await setup(db)
    await db.query('CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog')
    await db.query(`SELECT cron.schedule('gitarakordi-youtube-metadata-expiry','17 3 * * *',$1)`,[`DELETE FROM public."YouTubeMetadata" WHERE "fetchedAt"<CURRENT_TIMESTAMP-INTERVAL '29 days' OR ("fetchedAt" IS NULL AND "retryAfter"<CURRENT_TIMESTAMP-INTERVAL '2 days')`])
    await db.query('COMMIT')
    if(values.backfill){
      const rows=(await db.query('SELECT url FROM public."ListeningItem"')).rows
      require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
      const {youtubeSource}=require('../lib/music/model.ts')
      const result=await metadata(db,rows.map(r=>youtubeSource(r.url)).filter(Boolean),{deadlineMs:120000})
      console.log(JSON.stringify({schemaReady:true,dailyExpiry:true,listItems:rows.length,...result.stats}))
    }else console.log(JSON.stringify({schemaReady:true,dailyExpiry:true}))
  }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}finally{await db.end()}
}
if(require.main===module)main().catch(e=>{console.error(e.code||e.name);process.exitCode=1})
