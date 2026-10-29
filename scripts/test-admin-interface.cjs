/* eslint-disable @typescript-eslint/no-require-imports -- UI navigation unit fixtures. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module')
let pathname='/admin'
const original=Module._load
Module._load=function(request,parent,isMain){
  if(request==='next/navigation')return {usePathname:()=>pathname}
  if(request==='@/app/components/UiText')return {useI18n:()=>({t:value=>value})}
  return original.call(this,request,parent,isMain)
}
let Navigation
try{Navigation=require('../app/admin/AdminNavigation.tsx').default}finally{Module._load=original}
test('only the current admin section is highlighted, including nested editors',()=>{
  for(const [url,expected] of [['/admin','/admin'],['/admin/songs','/admin/songs'],['/admin/songs/a/edit','/admin/songs'],['/admin/artists/a/edit/merge','/admin/artists'],['/admin/prijave','/admin/prijave'],['/admin/korisnici','/admin/korisnici'],['/administrator',null]]){
    pathname=url
    assert.deepEqual(Navigation().props.children.filter(link=>link.props['aria-current']==='page').map(link=>link.props.href),expected?[expected]:[])
  }
})
test('legacy edit alias does not create a duplicate navigation item',()=>{
  pathname='/admin'
  const links=Navigation().props.children
  assert.equal(links.length,6)
  assert.equal(links.filter(link=>link.props.href==='/admin/edit').length,0)
  assert.ok(links.every(link=>link.props.children[0].props['aria-hidden']==='true'))
})
