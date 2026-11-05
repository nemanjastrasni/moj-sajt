/* eslint-disable @typescript-eslint/no-require-imports -- Additive, transaction-protected branding setup; never overwrites existing configuration. */
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID,randomBytes}=require('node:crypto'),{parseArgs}=require('node:util')
const root=path.resolve(__dirname,'..')
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {DEFAULT_BRANDING,validateBranding}=require('../lib/branding/model.ts'),{databaseClient}=require('./lib/artist-image-source.cjs')
const tables=['SiteBranding','SiteBrandingChange']
async function inspect(db,schema='public'){
 const columns=(await db.query('SELECT table_name,column_name,udt_name,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2::text[]) ORDER BY table_name,ordinal_position',[schema,tables])).rows
 const expected={SiteBranding:{id:'text',config:'jsonb',version:'text',updatedById:'text',updatedAt:'timestamp'},SiteBrandingChange:{id:'text',brandingId:'text',before:'jsonb',after:'jsonb',beforeVersion:'text',afterVersion:'text',actorId:'text',createdAt:'timestamp'}}
 const found=new Set(columns.map(column=>column.table_name))
 if(found.size&&found.size!==2)throw Error('Partial branding schema; preserved')
 if(found.size)for(const table of tables){const actual=columns.filter(column=>column.table_name===table);if(actual.length!==Object.keys(expected[table]).length||actual.some(column=>expected[table][column.column_name]!==column.udt_name||column.is_nullable!==(['updatedById','before','beforeVersion'].includes(column.column_name)?'YES':'NO')))throw Error('Unexpected branding schema; preserved')}
 if(found.size){
  const constraints=(await db.query('SELECT con.conname FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[])',[schema,tables])).rows.map(row=>row.conname)
  for(const name of ['SiteBranding_pkey','SiteBranding_id_check','SiteBranding_config_check','SiteBranding_version_check','SiteBrandingChange_pkey','SiteBrandingChange_brandingId_fkey','SiteBrandingChange_after_check'])if(!constraints.includes(name))throw Error('Unexpected branding constraints; preserved')
 }
 return {exists:found.size===2}
}
async function verify(db,schema='public'){
 const states=(await db.query('SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[])',[schema,tables])).rows
 if(states.length!==2||states.some(row=>!row.relrowsecurity))throw Error('Branding RLS check failed')
 for(const role of ['anon','authenticated'])for(const table of tables){
  const name='"'+schema+'"."'+table+'"'
  const allowed=(await db.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege($1,$2,'SELECT,INSERT,UPDATE,REFERENCES') AS allowed",[role,name])).rows[0].allowed
  if(allowed)throw Error('Unexpected browser-role grant')
 }
}
async function seed(db,schema='public'){
 const version=randomUUID(),config=JSON.stringify(validateBranding(DEFAULT_BRANDING)),name='"'+schema+'".'
 const inserted=await db.query(`INSERT INTO ${name}"SiteBranding" (id,config,version) VALUES ('home',$1::jsonb,$2) ON CONFLICT(id) DO NOTHING RETURNING id`,[config,version])
 if(inserted.rowCount)await db.query(`INSERT INTO ${name}"SiteBrandingChange" (id,"brandingId",after,"afterVersion","actorId") VALUES ($1,'home',$2::jsonb,$3,'system:setup')`,[randomUUID(),config,version])
 return inserted.rowCount===1
}
async function main(){
 const {values}=parseArgs({options:{ca:{type:'string'},apply:{type:'boolean',default:false},'check-schema':{type:'boolean',default:false}}})
 require('@next/env').loadEnvConfig(root)
 const sql=await fs.readFile(path.join(root,'prisma/sql/site-branding.sql'),'utf8'),db=await databaseClient(values.ca)
 let committed=false
 try{
  await db.query(values.apply||values['check-schema']?'BEGIN':'BEGIN READ ONLY');await db.query("SET LOCAL lock_timeout='5s'")
  if(values['check-schema']){
   const schema='branding_test_'+randomBytes(6).toString('hex');await db.query(`CREATE SCHEMA "${schema}"`)
   const testSql=sql.replaceAll('public.',`"${schema}".`);await db.query(testSql);await db.query(testSql)
   if(!await seed(db,schema)||await seed(db,schema))throw Error('Branding seed is not idempotent')
   await inspect(db,schema);await verify(db,schema)
   for(const role of ['anon','authenticated']){
    await db.query('SAVEPOINT permission_test');let denied=false
    try{await db.query(`SET LOCAL ROLE ${role}`);await db.query(`SELECT config FROM "${schema}"."SiteBranding"`)}catch(error){if(error.code==='42501')denied=true;else throw error}
    await db.query('ROLLBACK TO SAVEPOINT permission_test');if(!denied)throw Error('Browser access not denied')
   }
   await db.query('SAVEPOINT invalid_version');let rejected=false
   try{await db.query(`UPDATE "${schema}"."SiteBranding" SET version='invalid'`)}catch(error){if(error.code==='23514')rejected=true;else throw error}
   await db.query('ROLLBACK TO SAVEPOINT invalid_version');if(!rejected)throw Error('Version constraint missing')
   console.log(JSON.stringify({schemaTestPassed:true,idempotent:true,browserAccessDenied:true,productionWrites:0}));await db.query('ROLLBACK');return
  }
  const before=await inspect(db)
  if(!values.apply){if(before.exists)await verify(db);console.log(JSON.stringify({apply:false,...before,plannedTables:tables,defaultSlogans:DEFAULT_BRANDING.slogans.length}));await db.query('ROLLBACK');return}
  const lock=(await db.query("SELECT pg_try_advisory_xact_lock(hashtext('gitarakordi-site-branding-setup')) AS acquired")).rows[0].acquired
  if(!lock)throw Error('Another branding setup is running')
  await db.query(sql);const seeded=await seed(db);await inspect(db);await verify(db)
  await db.query('COMMIT');committed=true
  console.log(JSON.stringify({applied:true,createdTables:!before.exists,seeded,existingConfigurationPreserved:!seeded,otherTablesModified:0}))
 }finally{if(!committed)await db.query('ROLLBACK').catch(()=>{});await db.end()}
 if(committed){const fresh=await databaseClient(values.ca);try{await inspect(fresh);await verify(fresh);console.log(JSON.stringify({independentlyVerified:true,browserAccessDenied:true}))}finally{await fresh.end()}}
}
if(require.main===module)main().catch(error=>{console.error('Branding setup stopped:',/^[A-Z0-9_]{2,20}$/.test(error.code||'')?error.code:'operation-failed');process.exitCode=1})
module.exports={inspect,verify}
