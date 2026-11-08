/* eslint-disable @typescript-eslint/no-require-imports -- Additive private audit storage; no artist or song updates. */
const fs=require('node:fs/promises'),path=require('node:path'),{randomBytes}=require('node:crypto'),{parseArgs}=require('node:util'),{databaseClient}=require('./lib/artist-image-source.cjs')
const root=path.resolve(__dirname,'..'),tables=['AdminContentProposal','AdminContentEvent']
async function inspect(db,schema='public'){
 const rows=(await db.query('SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[])',[schema,tables])).rows
 if(rows.length!==2||rows.some(r=>!r.relrowsecurity))throw Error('PRIVATE_SCHEMA_NOT_READY')
 for(const role of ['anon','authenticated'])for(const table of tables){const allowed=(await db.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege($1,$2,'SELECT,INSERT,UPDATE,REFERENCES') AS allowed",[role,'"'+schema+'"."'+table+'"'])).rows[0].allowed;if(allowed)throw Error('UNEXPECTED_BROWSER_ACCESS')}
 const columns=(await db.query('SELECT table_name,column_name,udt_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2::text[])',[schema,tables])).rows
 const expected={AdminContentProposal:{id:'text',findingId:'text',subjectId:'text',field:'text',operation:'text',status:'text',data:'jsonb',actorId:'text',createdAt:'timestamptz',updatedAt:'timestamptz'},AdminContentEvent:{id:'text',proposalId:'text',action:'text',actorId:'text',createdAt:'timestamptz'}}
 for(const table of tables){const found=columns.filter(c=>c.table_name===table);if(found.length!==Object.keys(expected[table]).length||found.some(c=>expected[table][c.column_name]!==c.udt_name))throw Error('UNEXPECTED_SCHEMA')}
 return{ready:true,browserAccessDenied:true}
}
async function main(){
 const{values}=parseArgs({options:{ca:{type:'string'},apply:{type:'boolean',default:false},'check-schema':{type:'boolean',default:false}}});require('@next/env').loadEnvConfig(root)
 const db=await databaseClient(values.ca),sql=await fs.readFile(path.join(root,'prisma/sql/admin-content-actions.sql'),'utf8');let committed=false
 try{await db.query(values.apply||values['check-schema']?'BEGIN':'BEGIN READ ONLY');await db.query("SET LOCAL lock_timeout='5s'")
 if(values['check-schema']){const schema='admin_actions_test_'+randomBytes(6).toString('hex');await db.query(`CREATE SCHEMA "${schema}"`);const test=sql.replaceAll('public.',`"${schema}".`);await db.query(test);await db.query(test);await inspect(db,schema);await db.query('ROLLBACK');console.log(JSON.stringify({schemaTestPassed:true,idempotent:true,productionContentWrites:0}));return}
 if(values.apply){await db.query("SELECT pg_advisory_xact_lock(hashtext('admin-content-actions-setup'))");await db.query(sql);await inspect(db);await db.query('COMMIT');committed=true;console.log(JSON.stringify({applied:true,privateTables:tables,artistAndSongWrites:0}))}
 else{const result=await inspect(db);console.log(JSON.stringify(result));await db.query('ROLLBACK')}
 }finally{if(!committed)await db.query('ROLLBACK').catch(()=>{});await db.end()}
}
if(require.main===module)main().catch(e=>{console.error(e.code||(/^[A-Z_]+$/.test(e.message)?e.message:e.name));process.exitCode=1})
module.exports={inspect}
