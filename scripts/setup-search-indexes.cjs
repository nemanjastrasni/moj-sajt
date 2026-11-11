/* eslint-disable @typescript-eslint/no-require-imports -- Additive, concurrent PostgreSQL search index setup. */
const fs=require('node:fs/promises'),path=require('node:path'),{parseArgs}=require('node:util')
const ROOT=path.resolve(__dirname,'..')
const fold=column=>`replace(regexp_replace(normalize(lower(${column}), NFD), '[̀-ͯ]', '', 'g'), 'đ', 'dj')`
const definitions=[
 {name:'Song_search_title_trgm_idx',table:'Song',expression:fold('title')},
 {name:'Song_search_slug_trgm_idx',table:'Song',column:'slug'},
 {name:'Artist_search_name_trgm_idx',table:'Artist',expression:fold('name')},
 {name:'Artist_search_slug_trgm_idx',table:'Artist',column:'slug'},
]
const catalog=`SELECT i.relname AS name,t.relname AS table_name,x.indisvalid AS valid,x.indisready AS ready,am.amname AS method,
 pg_get_expr(x.indexprs,x.indrelid) AS expression,a.attname AS column_name,opc.opcname AS opclass,
 x.indnkeyatts AS keys,x.indpred IS NOT NULL AS partial
 FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid
 JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_am am ON am.oid=i.relam
 JOIN pg_opclass opc ON opc.oid=x.indclass[0] LEFT JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=x.indkey[0]
 WHERE n.nspname='public' AND t.relname IN ('Song','Artist')`
const canonical=value=>(value??'').toLowerCase().replace(/::text/g,'').replace(/[\s"]/g,'')
function matches(row,definition){return row.table_name===definition.table&&row.method==='gin'&&row.opclass==='gin_trgm_ops'&&row.keys===1&&!row.partial&&(definition.expression?canonical(row.expression)===canonical(definition.expression):!row.expression&&row.column_name===definition.column)}
async function setupSearchIndexes(db,{apply=false}={}){
 const existing=(await db.query(catalog)).rows
 for(const definition of definitions){const named=existing.find(row=>row.name===definition.name);if(named&&(!named.valid||!named.ready||!matches(named,definition)))throw Error('Existing index requires inspection: '+definition.name)}
 const pending=definitions.filter(def=>!existing.some(row=>row.valid&&row.ready&&matches(row,def)))
 const report={apply,created:[],existing:definitions.filter(def=>!pending.includes(def)).map(def=>def.name),missing:pending.map(def=>def.name)}
 if(!apply||!pending.length)return report
 await db.query("SET lock_timeout='3s'");await db.query("SET statement_timeout='60s'")
 const extensionSql="SELECT n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pg_trgm'"
 let schema=(await db.query(extensionSql)).rows[0]?.schema
 if(!schema){await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions');schema=(await db.query(extensionSql)).rows[0]?.schema}
 if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema??''))throw Error('Cannot resolve trigram operator class schema')
 const sql=await fs.readFile(path.join(ROOT,'prisma/sql/search-performance.sql'),'utf8')
 const statements=sql.split(';').map(s=>s.trim()).filter(s=>s.startsWith('CREATE INDEX'))
 if(statements.length!==definitions.length)throw Error('Unexpected search index manifest')
 for(const definition of pending){
  const statement=statements.find(s=>s.includes('"'+definition.name+'"'))
  if(!statement||!statement.includes('CONCURRENTLY'))throw Error('Index must be built concurrently')
  await db.query(statement.replaceAll('extensions.gin_trgm_ops',`"${schema}".gin_trgm_ops`))
  const rows=(await db.query(catalog)).rows,row=rows.find(r=>r.name===definition.name)
  if(!row||!row.valid||!row.ready||!matches(row,definition))throw Error('New index requires inspection: '+definition.name)
  report.created.push(definition.name)
 }
 report.missing=[]
 return report
}
async function main(){
 const {values}=parseArgs({options:{apply:{type:'boolean',default:false},ca:{type:'string'}}})
 require('@next/env').loadEnvConfig(ROOT,false,{info(){},error(){}})
 const db=await require('./lib/artist-image-source.cjs').databaseClient(values.ca)
 try{console.log(JSON.stringify(await setupSearchIndexes(db,{apply:values.apply}),null,2))}finally{await db.end()}
}
module.exports={setupSearchIndexes,definitions,matches}
if(require.main===module)main().catch(error=>{console.error('Search index setup stopped:',error.code||error.message);process.exitCode=1})
