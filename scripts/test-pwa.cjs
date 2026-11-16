/* eslint-disable @typescript-eslint/no-require-imports -- Installation state and public PWA fixtures without DB or OS installation. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio'),sharp=require('sharp')
const root=path.resolve(__dirname,'..'),original=Module._load
let locale='sr',manifest,page,AppInstall
Module._load=function(request,parent,main){
 if(request==='next/link')return{__esModule:true,default:props=>{const clean={...props};delete clean.prefetch;return React.createElement('a',clean,clean.children)}}
 if(request==='./UiText')return{useI18n:()=>({locale})}
 if(request.endsWith('.css'))return{__esModule:true,default:{}}
 if(request==='@/lib/prisma')throw Error('Public install page must not query DB')
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
try{manifest=require('../app/manifest.ts').default;page=require('../app/aplikacija/page.tsx');AppInstall=require('../app/components/AppInstall.tsx').default}finally{Module._load=original}
const {createInstallController}=require('../lib/pwa/install.ts')
const promptEvent=(outcome='accepted')=>{const event=new Event('beforeinstallprompt',{cancelable:true});let calls=0;Object.assign(event,{prompt:async()=>{calls++},userChoice:Promise.resolve({outcome})});return{event,calls:()=>calls}}

test('manifest launches the same origin without private context and allows landscape',async()=>{
 const m=manifest();assert.equal(m.id,'/');assert.equal(m.start_url,'/');assert.equal(m.scope,'/');assert.equal(m.display,'standalone');assert.equal(m.orientation,'any');assert.equal(m.prefer_related_applications,false)
 for(const n of [192,512]){const icon=m.icons.find(i=>i.sizes===`${n}x${n}`&&i.purpose==='any');assert.ok(icon);const info=await sharp(path.join(root,'public',icon.src)).metadata();assert.equal(info.width,n);assert.equal(info.height,n);assert.equal(info.format,'png')}
 const mask=m.icons.find(i=>i.purpose==='maskable');assert.ok(mask);const info=await sharp(path.join(root,'public',mask.src)).metadata(),stats=await sharp(path.join(root,'public',mask.src)).stats();assert.equal(info.width,512);assert.equal(info.height,512);assert.equal(stats.isOpaque,true)
})
test('unsupported browser has instructions and never invokes an invented installation prompt',async()=>{
 const c=createInstallController();await c.install();assert.equal(c.getSnapshot(),'unavailable')
 const html=load(renderToStaticMarkup(React.createElement(AppInstall)));assert.equal(html('button').length,0);assert.match(html.text(),/meni pregledača/)
})
test('one click consumes a native install event exactly once, including rapid duplicate clicks',async()=>{
 const c=createInstallController(),p=promptEvent();let changed=0;const stop=c.subscribe(()=>changed++)
 c.capture(p.event);assert.equal(p.event.defaultPrevented,true);assert.equal(c.getSnapshot(),'ready');await Promise.all([c.install(),c.install()]);assert.equal(p.calls(),1);assert.equal(c.getSnapshot(),'accepted');assert.equal(changed,3);stop();await c.install();assert.equal(p.calls(),1)
})
test('cancellation does not loop and a fresh browser event can offer installation again',async()=>{
 const c=createInstallController(),p=promptEvent('dismissed');c.capture(p.event);await c.install();assert.equal(c.getSnapshot(),'dismissed');await c.install();assert.equal(p.calls(),1)
 const next=promptEvent();c.capture(next.event);await c.install();assert.equal(next.calls(),1);assert.equal(c.getSnapshot(),'accepted')
})
test('installed mode wins a race with a pending prompt response and ignores new prompts',async()=>{
 const c=createInstallController(),p=promptEvent('dismissed');c.capture(p.event);const request=c.install();c.installed();await request;assert.equal(c.getSnapshot(),'installed');const next=promptEvent();c.capture(next.event);await c.install();assert.equal(next.calls(),0)
})
test('a rejected browser prompt becomes a recoverable error without leaking browser details',async()=>{
 const c=createInstallController(),p=promptEvent();p.event.prompt=async()=>{throw Error('browser detail')};c.capture(p.event);await c.install();assert.equal(c.getSnapshot(),'error');c.capture(promptEvent().event);assert.equal(c.getSnapshot(),'ready')
})
test('install instructions are public, bilingual and honest about internet and sign-in requirements',()=>{
 for(const lang of ['sr','en']){locale=lang;const $=load(renderToStaticMarkup(React.createElement(page.default)));assert.equal($('h1').length,1);assert.equal($('ol').length,2);assert.equal($('ol li').length,6);assert.ok($('a[href="/profile/plejliste"]').length);assert.ok($('a[href="/pesme"]').length);assert.match($.text(),lang==='sr'?/potrebna je internet veza/:/requires an internet connection/);assert.match($.text(),/Safari/)}locale='sr'
 assert.equal(new URL(page.metadata.alternates.canonical).pathname,'/aplikacija');assert.notEqual(page.metadata.robots?.index,false)
})
