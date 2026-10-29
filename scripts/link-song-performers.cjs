/* eslint-disable @typescript-eslint/no-require-imports -- Opt-in additive import with verified TLS. */
const fs = require("node:fs/promises"), path = require("node:path"), { parseArgs } = require("node:util")
require("@next/env").loadEnvConfig(path.resolve(__dirname, ".."))
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { databaseClient } = require("./lib/artist-image-source.cjs")
const { collaborationPlan } = require("../lib/artists/collaborations.ts")
const { artistNameKey, collaborationParts, missingPerformerNames } = require("../lib/artists/collaborations.ts")
const { createHash } = require("node:crypto")
const ROOT = path.resolve(__dirname, "..")
const protectedTables = ["Artist", "Song", "SongReview", "Favorite", "Playlist", "PlaylistSong", "PlaylistSongSetting"]
async function fingerprints(db) {
  const result = {}
  for (const table of protectedTables) result[table] = (await db.query(`SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), '')) AS hash FROM public."${table}" t`)).rows[0]
  return result
}
async function main() {
  const { values } = parseArgs({ options: { ca: { type: "string" }, apply: { type: "boolean", default: false }, "check-schema": { type: "boolean", default: false } } })
  const db = await databaseClient(values.ca)
  let committed = false
  try {
    if (values["check-schema"]) {
      await db.query("BEGIN")
      const schema = '"performers_test_' + require("node:crypto").randomBytes(6).toString("hex") + '"'
      await db.query(`CREATE SCHEMA ${schema}`)
      await db.query(`CREATE TABLE ${schema}."Song" (id text PRIMARY KEY); CREATE TABLE ${schema}."Artist" (id text PRIMARY KEY)`)
      const sql = (await fs.readFile(path.join(ROOT, "prisma/sql/song-performers.sql"), "utf8")).replaceAll("public.", schema + ".")
      await db.query(sql); await db.query(sql)
      await db.query(`INSERT INTO ${schema}."Song" VALUES ('song'); INSERT INTO ${schema}."Artist" VALUES ('a'),('b')`)
      await db.query(`INSERT INTO ${schema}."SongPerformer" VALUES ('song','a',0),('song','b',1)`)
      for (const input of ["('song','a',2)", "('song','b',0)", "('missing','a',0)", "('song','missing',2)", "('song','b',6)"]) {
        await db.query("SAVEPOINT invalid")
        let rejected = false
        try { await db.query(`INSERT INTO ${schema}."SongPerformer" VALUES ${input}`) } catch (error) { if (["23503", "23505", "23514"].includes(error.code)) rejected = true; else throw error }
        await db.query("ROLLBACK TO SAVEPOINT invalid")
        if (!rejected) throw Error("Constraint failed")
      }
      await db.query(`DELETE FROM ${schema}."Artist" WHERE id='a'`)
      if ((await db.query(`SELECT count(*)::int AS n FROM ${schema}."Song"`)).rows[0].n !== 1 || (await db.query(`SELECT count(*)::int AS n FROM ${schema}."SongPerformer"`)).rows[0].n !== 1) throw Error("Artist cascade must delete links only")
      await db.query(`DELETE FROM ${schema}."Song" WHERE id='song'`)
      if ((await db.query(`SELECT count(*)::int AS n FROM ${schema}."SongPerformer"`)).rows[0].n) throw Error("Song cascade failed")
      await db.query("ROLLBACK")
      console.log("Schema constraints and idempotency passed; all temporary changes rolled back.")
      return
    }
    await db.query(values.apply ? "BEGIN ISOLATION LEVEL REPEATABLE READ" : "BEGIN READ ONLY")
    await db.query("SET LOCAL lock_timeout='5s'")
    const artists = (await db.query('SELECT id,name,slug,category FROM public."Artist" ORDER BY name,id')).rows
    const songs = (await db.query('SELECT id,"artistId",title FROM public."Song" ORDER BY id')).rows
    const profiles = [], profileCollisions = []
    for (const name of missingPerformerNames) {
      const key = artistNameKey(name)
      if (artists.some(artist => artistNameKey(artist.name) === key)) continue
      const source = artists.find(artist => collaborationParts(artist.name)?.some(part => artistNameKey(part) === key))
      if (!source) continue
      const slug = key.replace(/ /g, "-")
      if (artists.some(artist => artist.slug === slug)) { profileCollisions.push({ name, slug }); continue }
      profiles.push({ id: "performer_" + createHash("sha256").update(key).digest("hex").slice(0, 24), name, slug, category: source.category })
    }
    const plan = collaborationPlan([...artists, ...profiles]), before = await fingerprints(db)
    const exists = Boolean((await db.query("SELECT to_regclass('public.\"SongPerformer\"') AS name")).rows[0].name)
    const existing = exists ? (await db.query('SELECT * FROM public."SongPerformer" ORDER BY "songId",position')).rows : []
    const added = [], conflicts = []
    for (const item of plan.ready) for (const song of songs.filter(song => song.artistId === item.source.id)) {
      const expected = item.performers.map((artist, position) => ({ songId: song.id, artistId: artist.id, position }))
      const saved = existing.filter(row => row.songId === song.id)
      if (saved.length) {
        if (JSON.stringify(saved) !== JSON.stringify(expected)) conflicts.push({ songId: song.id, saved, expected })
      } else added.push(...expected)
    }
    const directory = path.join(ROOT, "reports/song-performers", new Date().toISOString().replace(/[:.]/g, "-"))
    await fs.mkdir(directory, { recursive: true })
    const usedProfileIds = new Set(plan.ready.flatMap(item => item.performers.map(artist => artist.id)))
    const newProfiles = profiles.filter(profile => usedProfileIds.has(profile.id))
    const report = { apply: values.apply, plan, newProfiles, profileCollisions, protectedBefore: before, existing, added, conflicts }
    await fs.writeFile(path.join(directory, "plan.json"), JSON.stringify(report, null, 2), { flag: "wx" })
    if (values.apply) {
      if (conflicts.length) throw Error("Existing performer links differ; review the plan before applying")
      await db.query(await fs.readFile(path.join(ROOT, "prisma/sql/song-performers.sql"), "utf8"))
      for (const artist of newProfiles) await db.query('INSERT INTO public."Artist" (id,name,slug,category) VALUES ($1,$2,$3,$4)', [artist.id, artist.name, artist.slug, artist.category])
      for (const row of added) await db.query('INSERT INTO public."SongPerformer" ("songId","artistId",position) VALUES ($1,$2,$3)', [row.songId, row.artistId, row.position])
      const security = (await db.query(`SELECT c.relrowsecurity AS rls, (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND tablename='SongPerformer') AS policies, EXISTS (SELECT 1 FROM aclexplode(coalesce(c.relacl, acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee=0 OR r.rolname IN ('anon','authenticated')) AS public_grants FROM pg_class c WHERE c.oid='public."SongPerformer"'::regclass`)).rows[0]
      if (!security.rls || security.policies || security.public_grants) throw Error("Performer table is not private")
      const afterFingerprints = await fingerprints(db)
      const originalArtists = (await db.query('SELECT id,name,slug,category FROM public."Artist" WHERE NOT (id = ANY($1::text[])) ORDER BY name,id', [newProfiles.map(artist => artist.id)])).rows
      // New empty profiles are approved; every pre-existing row stays unchanged.
      const originalArtistHash = (await db.query('SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text), \'\' ORDER BY md5(to_jsonb(t)::text)), \'\')) AS hash FROM public."Artist" t WHERE NOT (id = ANY($1::text[]))', [newProfiles.map(artist => artist.id)])).rows[0]
      afterFingerprints.Artist = originalArtistHash
      if (JSON.stringify(before) !== JSON.stringify(afterFingerprints) || JSON.stringify(originalArtists) !== JSON.stringify(artists)) throw Error("Protected data changed; rollback")
      const after = (await db.query('SELECT * FROM public."SongPerformer" ORDER BY "songId",position')).rows
      if (after.length !== existing.length + added.length) throw Error("Unexpected link count")
      await fs.writeFile(path.join(directory, "result.json"), JSON.stringify({ security, links: after.length, protectedUnchanged: true }, null, 2), { flag: "wx" })
      await db.query("COMMIT"); committed = true
    } else await db.query("ROLLBACK")
    console.log(JSON.stringify({ applied: committed, matchedArtists: plan.ready.length, newProfiles: newProfiles.length, linkedSongs: new Set(added.map(row => row.songId)).size, addedLinks: added.length, unresolvedArtists: plan.unresolved.length, conflicts: conflicts.length, report: directory }, null, 2))
    for (const item of plan.ready) console.log("MATCH", item.source.name, "=>", item.performers.map(artist => artist.name).join(" | "))
    for (const item of plan.unresolved) console.log("REVIEW", item.source.name, "=>", item.parts.map(part => part.name + ":" + part.candidates.length).join(" | "))
  } catch (error) { if (!committed) await db.query("ROLLBACK").catch(() => {}); throw error }
  finally { await db.end() }
}
if (require.main === module) main().catch(error => { console.error("Performer import stopped:", error.code || error.message); process.exitCode = 1 })
