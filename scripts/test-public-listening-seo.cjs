/* eslint-disable @typescript-eslint/no-require-imports -- Isolated RSC request-cache and public metadata fixtures. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test,beforeEach}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),React=require('react')
const requestCache=new Map()
let reads,viewerReads,viewer,empty,down
const original=Module._load, Catalog=()=>null
Module._load=function(request,parent,main){
  if(request==='react')return {...React,cache:fn=>(...args)=>{
    const key=JSON.stringify(args)
    if(!requestCache.has(key))requestCache.set(key,Promise.resolve().then(()=>fn(...args)))
    return requestCache.get(key)
  }}
  if(request==='@/app/components/MusicCatalog')return {__esModule:true,default:Catalog}
  if(request==='@/lib/music/server')return {
    musicViewerId:async()=>{viewerReads++;return viewer},
    musicCatalog:async args=>{reads.push(args);if(down)throw Error('database unavailable');return empty?[]:[{id:'public',name:'Public user title stays out of SEO metadata',liked:args.viewerId==='first-user'}]},
  }
  if(request==='next/cache')throw Error('Viewer-dependent lists must not use a persistent data cache')
  if(request.startsWith('@/'))request=path.join(__dirname,'..',request.slice(2))
  return original.call(this,request,parent,main)
}
let page
try{page=require('../app/public-listening-playlists/page.tsx')}finally{Module._load=original}
beforeEach(()=>{reads=[];viewerReads=0;viewer='first-user';empty=down=false;requestCache.clear()})
const props=query=>({searchParams:Promise.resolve(query)})
test('public catalog HTML and metadata share one normalized request read',async()=>{
  const meta=await page.generateMetadata(props({category:'Strane',page:'2',private:'ignored'}))
  const tree=await page.default(props({category:'Strane',page:'2'}))
  assert.equal(new URL(meta.alternates.canonical).search,'?category=Strane&page=2')
  assert.equal(meta.robots,undefined)
  assert.deepEqual(reads,[{viewerId:'first-user',category:'Strane',page:2,limit:50}])
  assert.equal(viewerReads,1);assert.equal(tree.type,Catalog);assert.equal(tree.props.owned,false)
  assert.doesNotMatch(JSON.stringify(meta),/first-user|Public user title|liked/)
})
test('empty public pages retain their canonical but are noindex/follow',async()=>{
  empty=true
  const meta=await page.generateMetadata(props({page:'10000'}))
  assert.deepEqual(meta.robots,{index:false,follow:true})
  assert.equal(new URL(meta.alternates.canonical).search,'?page=10000')
  assert.deepEqual((await page.default(props({page:'10000'}))).props.lists,[])
  assert.equal(reads.length,1)
})
test('top lists and invalid filters use the same bounded query for SEO and display',async()=>{
  const query={category:'admin',top:'1',page:'9999'}
  const meta=await page.generateMetadata(props(query)),tree=await page.default(props(query))
  assert.equal(new URL(meta.alternates.canonical).search,'?category=admin&top=1')
  assert.equal(tree.props.page,1);assert.equal(reads[0].limit,20)
  const invalid=await page.generateMetadata(props({category:['Strane'],page:'-5'}))
  assert.equal(new URL(invalid.alternates.canonical).search,'')
  assert.equal(reads.at(-1).category,'');assert.equal(reads.at(-1).page,1)
})
test('viewer liked flags are isolated between requests and never enter metadata',async()=>{
  const first=await page.default(props({}))
  assert.equal(first.props.lists[0].liked,true)
  requestCache.clear();viewer='second-user'
  const second=await page.default(props({}))
  assert.equal(second.props.lists[0].liked,false)
  assert.equal(viewerReads,2)
  assert.equal((await page.generateMetadata(props({}))).robots,undefined)
})
test('service failure throws rather than publishing an empty successful noindex page',async()=>{
  down=true
  await assert.rejects(page.generateMetadata(props({})),/database unavailable/)
  await assert.rejects(page.default(props({})),/database unavailable/)
  assert.equal(reads.length,1)
})
