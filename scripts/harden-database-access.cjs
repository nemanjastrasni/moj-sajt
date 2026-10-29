/* eslint-disable @typescript-eslint/no-require-imports -- Explicit, opt-in database maintenance. */
const fs = require('node:fs/promises'), path = require('node:path'), { parseArgs } = require('node:util')
const { loadEnvConfig } = require('@next/env'), { databaseClient } = require('./lib/artist-image-source.cjs')
const ROOT = path.resolve(__dirname, '..')
const TABLES = new Set(['Account','Artist','Favorite','ListeningItem','ListeningPlaylist','ListeningPlaylistLike','Playlist','PlaylistSong','PlaylistSongSetting','Session','Song','SongPerformer','SongReport','SongReview','SongSubmission','User','VerificationToken','Visit','analytics','online_presence','playing_with_neon'])
const quote = value => '"' + value.replaceAll('"', '""') + '"'
const targets = 'PUBLIC, anon, authenticated'
function normalized(state) {
  return { ...state, objects:state.objects.map(obj=>{
    const copy={...obj,grants:[...obj.grants].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))}
    delete copy.relacl
    return copy
  }),defaults:state.defaults.map(obj=>({...obj,grants:[...obj.grants].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))})) }
}
async function snapshot(db) {
  const actor = (await db.query(`SELECT current_user AS name,rolbypassrls FROM pg_roles WHERE rolname=current_user`)).rows[0]
  if (actor.name !== 'postgres' || !actor.rolbypassrls) throw Error('Unexpected server role; no changes made')
  const objects = (await db.query(`SELECT c.oid,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner,c.relacl::text,
    coalesce((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname END,'privilege',a.privilege_type,'grantable',a.is_grantable)) FROM aclexplode(coalesce(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee),'[]') AS grants
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S') ORDER BY c.relname`)).rows
  for (const obj of objects) {
    if (obj.owner !== 'postgres' || (obj.relkind !== 'S' && (!TABLES.has(obj.relname) || !['r','p'].includes(obj.relkind)))) throw Error('Unexpected public object; review scope first')
  }
  const columnGrants = (await db.query(`SELECT count(*)::int AS count FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND a.attacl IS NOT NULL`)).rows[0].count
  if (columnGrants) throw Error('Column-level privileges need manual review')
  const policies = (await db.query(`SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname`)).rows
  if (policies.length) throw Error('Existing policies need manual review')
  const defaults = (await db.query(`SELECT d.defaclobjtype,coalesce((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE r.rolname END,'privilege',a.privilege_type,'grantable',a.is_grantable)) FROM aclexplode(d.defaclacl) a LEFT JOIN pg_roles r ON r.oid=a.grantee),'[]') AS grants FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public' AND d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname='postgres') AND d.defaclobjtype IN ('r','S') ORDER BY d.defaclobjtype`)).rows
  return { actor, objects, policies, defaults }
}
function plan(state) {
  const sql = [], restore = []
  for (const obj of state.objects) {
    const name = 'public.' + quote(obj.relname), kind = obj.relkind === 'S' ? 'SEQUENCE' : 'TABLE'
    sql.push(`REVOKE ALL PRIVILEGES ON ${kind} ${name} FROM ${targets};`)
    restore.push(`REVOKE ALL PRIVILEGES ON ${kind} ${name} FROM ${targets};`)
    for (const grant of obj.grants.filter(g => ['PUBLIC','anon','authenticated'].includes(g.role))) restore.push(`GRANT ${grant.privilege} ON ${kind} ${name} TO ${grant.role === 'PUBLIC' ? 'PUBLIC' : quote(grant.role)}${grant.grantable ? ' WITH GRANT OPTION' : ''};`)
    if (kind === 'TABLE') {
      sql.push(`ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY;`)
      restore.push(`ALTER TABLE ${name} ${obj.relrowsecurity ? 'ENABLE' : 'DISABLE'} ROW LEVEL SECURITY;`)
    }
  }
  for (const [type,kind] of [['r','TABLES'],['S','SEQUENCES']]) {
    const prefix = `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public`
    sql.push(`${prefix} REVOKE ALL PRIVILEGES ON ${kind} FROM ${targets};`)
    restore.push(`${prefix} REVOKE ALL PRIVILEGES ON ${kind} FROM ${targets};`)
    for (const grant of (state.defaults.find(d=>d.defaclobjtype===type)?.grants || []).filter(g=>['PUBLIC','anon','authenticated'].includes(g.role))) restore.push(`${prefix} GRANT ${grant.privilege} ON ${kind} TO ${grant.role === 'PUBLIC' ? 'PUBLIC' : quote(grant.role)}${grant.grantable ? ' WITH GRANT OPTION' : ''};`)
  }
  return {sql:sql.join('\n'), restore:'-- Restores the previous, potentially unsafe access. Review before use.\nBEGIN;\n'+restore.join('\n')+'\nCOMMIT;\n'}
}
async function dataState(db, objects) {
  const result = {}
  for (const obj of objects.filter(o=>o.relkind!=='S')) result[obj.relname] = (await db.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS hash FROM public.${quote(obj.relname)} t`)).rows[0]
  return result
}
async function verify(db) {
  const state = await snapshot(db)
  for (const obj of state.objects) {
    if (obj.grants.some(g=>['PUBLIC','anon','authenticated'].includes(g.role)) || obj.relkind !== 'S' && !obj.relrowsecurity) throw Error('Access verification failed')
    for (const role of ['anon','authenticated']) {
      const privileges = (await db.query(obj.relkind === 'S' ? `SELECT has_sequence_privilege($1,$2::oid,'SELECT,UPDATE,USAGE') AS allowed` : `SELECT has_table_privilege($1,$2::oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege($1,$2::oid,'SELECT,INSERT,UPDATE,REFERENCES') AS allowed`,[role,obj.oid])).rows[0]
      if (privileges.allowed) throw Error('Inherited table access remains')
    }
  }
  for (const entry of state.defaults) if (entry.grants.some(g=>['PUBLIC','anon','authenticated'].includes(g.role))) throw Error('Default grants remain')
  return state
}
async function main() {
  const {values} = parseArgs({options:{ca:{type:'string'},apply:{type:'boolean',default:false},check:{type:'boolean',default:false}}})
  loadEnvConfig(ROOT)
  const db = await databaseClient(values.ca)
  let committed = false
  try {
    if (values.check) { const state=await verify(db); console.log(JSON.stringify({verified:true,tables:state.objects.filter(o=>o.relkind!=='S').length})); return }
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ')
    await db.query("SET LOCAL lock_timeout='5s'")
    const before = await snapshot(db), changes = plan(before)
    if (!values.apply) { console.log(JSON.stringify({apply:false,tables:before.objects.filter(o=>o.relkind!=='S').length,sequences:before.objects.filter(o=>o.relkind==='S').length,serverRole:before.actor.name})); await db.query('ROLLBACK'); return }
    // Block concurrent writes only while comparing rows and changing metadata.
    const names = before.objects.filter(o=>o.relkind!=='S').map(o=>'public.'+quote(o.relname))
    await db.query(`LOCK TABLE ${names.join(',')} IN SHARE MODE`)
    const dataBefore = await dataState(db,before.objects)
    const backup = path.join(ROOT,'reports/database-access',new Date().toISOString().replace(/[:.]/g,'-'))
    await fs.mkdir(backup,{recursive:true})
    await fs.writeFile(path.join(backup,'before.json'),JSON.stringify({before,dataBefore,containsUserContent:false},null,2),{flag:'wx'})
    await fs.writeFile(path.join(backup,'restore.sql'),changes.restore,{flag:'wx'})
    // Exercise both the change and its generated recovery inside a savepoint.
    await db.query('SAVEPOINT recovery_test')
    await db.query(changes.sql); await verify(db)
    await db.query(changes.restore.split('\n').filter(line=>line!=='BEGIN;'&&line!=='COMMIT;').join('\n'))
    if (JSON.stringify(normalized(await snapshot(db))) !== JSON.stringify(normalized(before))) throw Error('Recovery metadata did not match')
    await db.query('ROLLBACK TO SAVEPOINT recovery_test')
    await db.query(changes.sql)
    const after = await verify(db)
    if (JSON.stringify(dataBefore)!==JSON.stringify(await dataState(db,after.objects))) throw Error('Unexpected row changes; rollback')
    // Prove a browser role cannot even select a password-bearing table (no rows returned).
    for (const role of ['anon','authenticated']) {
      await db.query('SAVEPOINT denied_read')
      await db.query(`SET LOCAL ROLE ${quote(role)}`)
      let denied=false
      try { await db.query('SELECT 1 FROM public."User" LIMIT 0') } catch(error) { if(error.code==='42501') denied=true; else throw error }
      await db.query('ROLLBACK TO SAVEPOINT denied_read')
      if(!denied) throw Error('Public role read was not denied')
    }
    await db.query('COMMIT'); committed=true
    console.log(JSON.stringify({applied:true,rowsUnchanged:true,recoveryTested:true,backup}))
  } catch(error) { if(!committed) await db.query('ROLLBACK').catch(()=>{}); throw error }
  finally { await db.end() }
  const fresh=await databaseClient(values.ca)
  try { const state=await verify(fresh); console.log(JSON.stringify({independentlyVerified:true,tables:state.objects.filter(o=>o.relkind!=='S').length,sequences:state.objects.filter(o=>o.relkind==='S').length})) } finally {await fresh.end()}
}
if(require.main===module)main().catch(error=>{console.error('Access hardening stopped:',error.code||error.message);process.exitCode=1})
module.exports={plan,quote,snapshot,dataState,verify}
