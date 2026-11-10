/* eslint-disable @typescript-eslint/no-require-imports -- Real asset integrity and rendered responsive HTML, without live services. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),Module=require('node:module'),sharp=require('sharp')
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),cheerio=require('cheerio')
const root=path.join(__dirname,'..'),photos=require('../public/artist-photos/manifest.json').photos,variants=require('../lib/artist-image-variants.json')
const {responsiveArtistImage}=require('../lib/artistResponsive.ts')
const original=Module._load
Module._load=function(request,parent,main){if(request.endsWith('.module.css'))return{__esModule:true,default:new Proxy({},{get:(_,k)=>k})};if(request.startsWith('@/'))request=path.join(root,request.slice(2));return original.call(this,request,parent,main)}
let ArtistImage;try{ArtistImage=require('../app/components/ArtistImage.tsx').default}finally{Module._load=original}

test('every reviewed local photo has genuine, bounded thumbnails and an unchanged original',async()=>{
 let sourceTotal=0,avatarTotal=0
 assert.equal(Object.keys(variants).length,new Set(photos.map(p=>p.image)).size)
 for(const photo of photos){
  const originalBytes=await fs.readFile(path.join(root,'public',photo.image));assert.equal(crypto.createHash('sha256').update(originalBytes).digest('hex'),photo.sha256)
  const sourceMeta=await sharp(originalBytes).metadata(),candidates=variants[photo.image]
  assert.equal(candidates.at(-1).src,photo.image)
  let previous=0
  for(const row of candidates){assert.ok(row.width>previous&&row.width<=sourceMeta.width);previous=row.width;const bytes=await fs.readFile(path.join(root,'public',row.src)),meta=await sharp(bytes).metadata();assert.equal(meta.width,row.width);assert.equal(meta.height,row.height);assert.equal(bytes.length,row.bytes);assert.equal(meta.format,'webp');assert.ok(Math.abs(row.height-row.width*sourceMeta.height/sourceMeta.width)<=1, row.src);if(row.src!==photo.image)assert.ok(row.src.includes(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12)))}
  sourceTotal+=originalBytes.length;avatarTotal+=(candidates.find(r=>r.width>=80)??candidates.at(-1)).bytes
 }
 assert.ok(avatarTotal<sourceTotal*.05,'40px avatars at DPR 2 must be under 5% of the original transfer size')
})

test('avatar HTML offers only small candidates while portraits retain larger choices and explicit sizes',()=>{
 const photo=photos.find(p=>variants[p.image].at(-1).width>=640)
 const $=cheerio.load(renderToStaticMarkup(React.createElement(ArtistImage,{src:photo.image,name:photo.artistName})))
 assert.equal($('img').attr('sizes'),'40px');assert.equal($('img').attr('loading'),'lazy');assert.equal($('img').attr('alt'),photo.artistName)
 const avatar=responsiveArtistImage(photo.image,'avatar');assert.ok(!avatar.srcSet.includes('320w'));assert.ok(!avatar.srcSet.includes('640w'));assert.ok(avatar.src.includes('/responsive/'))
 const portrait=responsiveArtistImage(photo.image,'portrait','120px');assert.equal(portrait.sizes,'120px');assert.ok(portrait.srcSet.includes('640w')||portrait.srcSet.includes('1200w'))
 const eager=cheerio.load(renderToStaticMarkup(React.createElement(ArtistImage,{src:photo.image,name:'Photo',variant:'portrait',priority:true})))
 assert.equal(eager('img').attr('loading'),'eager');assert.equal(eager('img').attr('fetchpriority'),'high')
})

test('manual external photos and missing images keep their fallback instead of inventing thumbnail URLs',()=>{
 const remote=responsiveArtistImage('https://example.com/manual.jpg','avatar');assert.equal(remote.src,'https://example.com/manual.jpg');assert.equal(remote.srcSet,undefined)
 for(const src of [null,'javascript:alert(1)']){const $=cheerio.load(renderToStaticMarkup(React.createElement(ArtistImage,{src,name:'Test Bend'})));assert.equal($('img').length,0);assert.equal($('[role=img]').attr('aria-label'),'Test Bend');assert.equal($('.initials').text(),'TB')}
})
