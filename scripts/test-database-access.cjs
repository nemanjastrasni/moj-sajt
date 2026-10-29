/* eslint-disable @typescript-eslint/no-require-imports -- Node maintenance tests. */
const {test}=require('node:test'),assert=require('node:assert/strict')
const {plan,quote}=require('./harden-database-access.cjs')
test('identifiers are quoted, not interpolated as executable SQL',()=>{
  assert.equal(quote('a";DROP TABLE x;--'),'"a"";DROP TABLE x;--"')
})
test('hardening only removes browser privileges and enables, never forces, RLS',()=>{
  const state={objects:[{relname:'User',relkind:'r',relrowsecurity:false,grants:[{role:'anon',privilege:'SELECT',grantable:false},{role:'authenticated',privilege:'UPDATE',grantable:true},{role:'service_role',privilege:'SELECT',grantable:false}]},{relname:'counter',relkind:'S',grants:[]}],defaults:[]}
  const result=plan(state)
  assert.match(result.sql,/ALTER TABLE public\."User" ENABLE ROW LEVEL SECURITY/)
  assert.match(result.sql,/REVOKE ALL PRIVILEGES ON SEQUENCE public\."counter" FROM PUBLIC, anon, authenticated/)
  assert.doesNotMatch(result.sql,/FORCE|DROP|DELETE|UPDATE|INSERT|service_role/)
  assert.match(result.restore,/GRANT SELECT ON TABLE public\."User" TO "anon";/)
  assert.match(result.restore,/GRANT UPDATE ON TABLE public\."User" TO "authenticated" WITH GRANT OPTION/)
  assert.match(result.restore,/DISABLE ROW LEVEL SECURITY/)
  assert.match(result.sql,/FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES/)
})
test('recovery retains existing RLS and public/default grants',()=>{
  const result=plan({objects:[{relname:'SongReport',relkind:'r',relrowsecurity:true,grants:[{role:'PUBLIC',privilege:'SELECT',grantable:false}]}],defaults:[{defaclobjtype:'S',grants:[{role:'anon',privilege:'USAGE',grantable:false}]}]})
  assert.match(result.restore,/ENABLE ROW LEVEL SECURITY/)
  assert.doesNotMatch(result.restore,/DISABLE ROW LEVEL SECURITY/)
  assert.match(result.restore,/GRANT SELECT ON TABLE public\."SongReport" TO PUBLIC;/)
  assert.match(result.restore,/IN SCHEMA public GRANT USAGE ON SEQUENCES TO "anon"/)
})
