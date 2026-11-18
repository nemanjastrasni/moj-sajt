/* eslint-disable @typescript-eslint/no-require-imports -- Isolated service-worker network/cache simulation. */
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto')
function harness(){
 const origin='https://site.test',handlers={},stores=new Map();let fail=false,revision=1
 const key=v=>new URL(typeof v==='string'?v:v.url,origin).href
 const caches={keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),open:async name=>{if(!stores.has(name))stores.set(name,new Map());const rows=stores.get(name);return{put:async(k,v)=>rows.set(key(k),v.clone()),match:async k=>rows.get(key(k))?.clone()}}}
 const fetch=async input=>{const url=key(input),p=new URL(url).pathname;if(fail)throw Error('network down');if(p==='/offline')return new Response(`<link href="/_next/static/css/app.css" rel="stylesheet"><script src="/_next/static/chunks/app${revision}.js"></script>`,{headers:{'content-type':'text/html'}});if(p.endsWith('.css'))return new Response('body{font-family:test} @font-face{src:url(../media/font.woff2)}');return new Response('public asset')}
 const self={location:{origin},clients:{claim:async()=>{}},skipWaiting(){},addEventListener:(name,handler)=>handlers[name]=handler}
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/offline-sw.js'),'utf8'),{self,caches,fetch,URL,Response,TextEncoder,crypto:webcrypto})
 const prepare=async()=>{let work,result;handlers.message({data:{type:'PREPARE_OFFLINE'},ports:[{postMessage:value=>result=value}],waitUntil:value=>work=value});await work;return result}
 const request=async(url,mode='navigate',method='GET')=>{let response;handlers.fetch({request:{url:key(url),mode,method},respondWith:value=>response=value});return response?await response:null}
 return{stores,caches,prepare,request,fail:()=>{fail=true},next:()=>{revision++},origin}
}
test('preparation caches only public shell, static scripts/styles and discovered fonts',async()=>{
 const h=harness();assert.equal((await h.prepare()).ok,true)
 const paths=[...h.stores.values()].flatMap(rows=>[...rows.keys()].map(u=>new URL(u).pathname));assert.ok(paths.includes('/_next/static/media/font.woff2'));assert.ok(paths.includes('/offline'));assert.ok(paths.every(p=>p.startsWith('/_next/static/')||['/offline','/offline-shell-pointer'].includes(p)))
})
test('API calls, POSTs and RSC data are never cached or replaced with offline HTML',async()=>{
 const h=harness();await h.prepare();h.fail()
 for(const [url,mode,method]of [['/api/playlist/private/offline','cors','GET'],['/api/auth/signout','cors','POST'],['/plejliste/private?_rsc=1','cors','GET']])assert.equal(await h.request(url,mode,method),null)
})
test('offline cold start redirects to the cached library and serves cached scripts',async()=>{
 const h=harness();await h.prepare();h.fail();const root=await h.request('/');assert.equal(root.status,302);assert.equal(root.headers.get('location'),h.origin+'/offline');assert.match(await(await h.request('/offline')).text(),/app1\.js/);assert.equal(await(await h.request('/_next/static/chunks/app1.js','cors')).text(),'public asset')
})
test('failed refresh retains the previous complete shell pointer and offline app',async()=>{
 const h=harness();await h.prepare();h.next();h.fail();assert.equal((await h.prepare()).ok,false);assert.match(await(await h.request('/offline')).text(),/app1\.js/)
})
