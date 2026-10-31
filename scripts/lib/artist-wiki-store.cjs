/* eslint-disable @typescript-eslint/no-require-imports -- Shared CommonJS maintenance and server helpers. */
/* Shared PostgreSQL storage; attribution and content are committed together. */
const { createHash } = require('node:crypto')
const { stableStringify } = require('../../lib/wiki-values.cjs')
const hash = value => createHash('sha256').update(stableStringify(value)).digest('hex')
const SCHEMA = `CREATE TABLE IF NOT EXISTS public."ArtistWikiProfile" (
  "artistId" text PRIMARY KEY REFERENCES public."Artist"(id) ON DELETE CASCADE,
  "artistName" text NOT NULL, slug text NOT NULL, "wikidataId" text,
  state text NOT NULL DEFAULT 'pending', "bioSource" jsonb, "discographySource" jsonb,
  "checkedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
)`
async function setup(client) {
  await client.query(SCHEMA)
  await client.query('ALTER TABLE public."ArtistWikiProfile" ENABLE ROW LEVEL SECURITY')
  await client.query('REVOKE ALL ON public."ArtistWikiProfile" FROM anon, authenticated')
  await client.query(`CREATE OR REPLACE FUNCTION public.queue_artist_wikipedia() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
    INSERT INTO public."ArtistWikiProfile" ("artistId","artistName",slug,state) VALUES (NEW.id,NEW.name,NEW.slug,'pending') ON CONFLICT ("artistId") DO NOTHING;
    RETURN NEW;
  END $$`)
  await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='artist_wikipedia_pending' AND tgrelid='public."Artist"'::regclass) THEN CREATE TRIGGER artist_wikipedia_pending AFTER INSERT ON public."Artist" FOR EACH ROW EXECUTE FUNCTION public.queue_artist_wikipedia(); END IF; END $$`)
}
function credit(value, source) { return source ? { ...source, hash: hash(value) } : null }
function validSource(source) {
  if (!source || !['sr','sh','hr','bs','en'].includes(source.language) || !Number.isInteger(source.revisionId) || source.revisionId<1 || !Number.isInteger(source.pageId) || source.pageId<1 || !source.title || source.license!=='https://creativecommons.org/licenses/by-sa/4.0/') return false
  const base=`https://${source.language}.wikipedia.org`
  try {
    return source.revisionUrl===base+'/w/index.php?oldid='+source.revisionId && [source.url,source.historyUrl].every(value=>{const u=new URL(value);return u.origin===base && !u.username && !u.password})
  }catch{return false}
}
function eligibleDiscography(value) {
  return Array.isArray(value) && value.length > 0 && value.every(a => a && typeof a.title === 'string' && a.title.trim() && /^(19|20)\d{2}$/.test(a.year) && Number(a.year) <= new Date().getUTCFullYear() && ['studio','live','compilation','album'].includes(a.kind))
}
async function saveProfile(client, artist, proposal, sources = {}) {
  await client.query(`INSERT INTO public."ArtistWikiProfile" ("artistId","artistName",slug,"wikidataId",state,"bioSource","discographySource","checkedAt")
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,CURRENT_TIMESTAMP)
    ON CONFLICT ("artistId") DO UPDATE SET "artistName"=EXCLUDED."artistName",slug=EXCLUDED.slug,"wikidataId"=EXCLUDED."wikidataId",state=EXCLUDED.state,
    "bioSource"=COALESCE(EXCLUDED."bioSource","ArtistWikiProfile"."bioSource"),"discographySource"=COALESCE(EXCLUDED."discographySource","ArtistWikiProfile"."discographySource"),"checkedAt"=CURRENT_TIMESTAMP`,
    [artist.id,artist.name,artist.slug,proposal.wikidataId || null,proposal.state,sources.bio ? JSON.stringify(sources.bio) : null,sources.discography ? JSON.stringify(sources.discography) : null])
}
module.exports = { setup, SCHEMA, hash, credit, validSource, eligibleDiscography, saveProfile }
