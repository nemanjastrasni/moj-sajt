/* eslint-disable @typescript-eslint/no-require-imports -- Render public discovery HTML with isolated data. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio')
const root=path.resolve(__dirname,'..'),original=Module._load
let locale='sr',reads=0
Module._load=function(request,parent,main){
 if(request==='next/link')return{__esModule:true,default:props=>{const clean={...props};delete clean.prefetch;return React.createElement('a',clean,clean.children)}}
 if(request==='next/navigation')return{useRouter:()=>({}),notFound:()=>{throw Object.assign(Error('Not found'),{status:404})}}
 if(request==='@/app/components/UiText'||request==='./UiText')return{__esModule:true,default:({text})=>text,CategoryLabel:({value})=>value,useI18n:()=>({t:s=>s,locale})}
 if(request==='@/lib/prisma')return{prisma:new Proxy({},{get(){throw Error('Unexpected DB access')}})}
 if(request==='@/lib/adminContent/server')return{contentAdmin:async()=>null}
 if(request==='@/lib/homeSongsServer')return{getHomeSongs:async()=>{reads++;return[]}}
 if(request==='@/lib/artists/publicCatalog')return{readArtistCards:async()=>{reads++;return[]}}
 if(request==='./MusicContext')return{useMusic:()=>({loading:false})}
 if(request==='next/cache')return{unstable_cache:fn=>fn}
 if(/\/(Hero|HomeRepertoire|PopularSongs|LatestSongs|SiteImage|ArtistMosaic|MusicButton)$/.test(request))return{__esModule:true,default:()=>null}
 if(request.endsWith('.css'))return{__esModule:true,default:{}}
 if(request.startsWith('@/'))request=path.join(root,request.slice(2))
 return original.call(this,request,parent,main)
}
let home,category,bio,playlists,rows,music,guides,sitemaps
try{
 home=require('../app/page.tsx');category=require('../app/pesme/[category]/page.tsx');bio=require('../app/biografija/page.tsx');playlists=require('../app/plejliste/page.tsx');rows=require('../app/components/ArtistSongList.tsx').ArtistSongRows;music=require('../app/components/MusicCatalog.tsx').default;guides=require('../lib/guitarGuides.ts');sitemaps=require('../lib/seo/sitemaps.ts')
}finally{Module._load=original}
const render=element=>load(renderToStaticMarkup(element))
test('homepage exposes one visible H1 and crawlable routes to each public feature without new database queries',async()=>{
 reads=0;const $=render(await home.default());assert.equal($('h1').length,1);assert.ok(!$('h1').hasClass('sr-only'));assert.match($('h1').text(),/Akordi za gitaru/)
 for(const href of ['/pesme','/akordi','/biografija','/plejliste','/public-listening-playlists','/vodici','/vodici/plejliste-za-gitaru-i-pdf-pesmarica','/vodici/youtube-muzika-i-muzicke-plejliste'])assert.ok($(`a[href="${href}"]`).length,href)
 assert.equal(reads,2,'only the existing popular/latest reads');assert.equal($('[hidden]').length,0)
})
test('categories have distinct descriptive titles, single visible H1 and relevant practice links',async()=>{
 const seen=new Set();for(const kind of ['domace','narodne','strane']){reads=0;const props={params:Promise.resolve({category:kind})},meta=await category.generateMetadata(props),$=render(await category.default(props));assert.ok(!seen.has(meta.title));seen.add(meta.title);assert.equal(new URL(meta.alternates.canonical).pathname,'/pesme/'+kind);assert.equal($('h1').length,1);assert.ok($('p').text().length>150);assert.ok($(`a[href="/plejliste/${kind}"]`).length);assert.equal(reads,1)}
 await assert.rejects(category.generateMetadata({params:Promise.resolve({category:'unknown'})}),e=>e.status===404)
})
test('biography and playlist hubs explain their actual features and connect to sources and instructions',()=>{
 const b=render(bio.default()),p=render(playlists.default());assert.match(b('h1').text(),/Biografije i diskografije/);assert.ok(b('a[href="/wiki-izvori"]').length);assert.ok(b('p').text().length>300);assert.ok(p('a[href="/vodici/plejliste-za-gitaru-i-pdf-pesmarica"]').length);assert.match(p('p').text(),/PDF pesmaricu/)
})
test('public music explains embedded playback without exposing private content, and own catalog omits public promotion',()=>{
 const pub=render(React.createElement(music,{lists:[],owned:false}));assert.ok(pub('a[href="/vodici/youtube-muzika-i-muzicke-plejliste"]').length);assert.match(pub('p').text(),/ugrađenom plejeru/)
 const own=render(React.createElement(music,{lists:[],owned:true}));assert.equal(own('a[href="/vodici/youtube-muzika-i-muzicke-plejliste"]').length,0)
})
test('ordinary and lead-performer song links use canonical URLs; second performer preserves the functional return context',()=>{
 const first={id:'lead',name:'Lead',slug:'lead',category:'strane'},second={id:'guest',name:'Guest',slug:'guest',category:'strane'},song={id:'s',slug:'song',title:'Song',artist:{slug:'lead',category:'strane'},assessment:{level:null,hasChords:true}}
 const href=(artistId,performers)=>render(React.createElement(rows,{category:'strane',artist:'lead',artistId,songs:[{...song,performers}]}))('li > a').attr('href')
 assert.equal(href('lead',[]),'/pesme/strane/lead/song');assert.equal(href('lead',[{artist:first},{artist:second}]),'/pesme/strane/lead/song');assert.equal(href('guest',[{artist:first},{artist:second}]),'/pesme/strane/lead/song?artist=guest');assert.equal(href('unrelated',[{artist:first},{artist:second}]),'/pesme/strane/lead/song')
})
test('new app instructions have stable public URLs and enter the static sitemap exactly once',()=>{
 for(const slug of ['plejliste-za-gitaru-i-pdf-pesmarica','youtube-muzika-i-muzicke-plejliste']){const guide=guides.getGuitarGuide(slug);assert.ok(guide);assert.ok(guide.sections.flatMap(s=>s.paragraphs).every(p=>p.sr.length>100&&p.en.length>100));assert.equal(sitemaps.sitemapStaticPaths.filter(p=>p==='/vodici/'+slug).length,1)}
 assert.ok(!sitemaps.sitemapStaticPaths.includes('/profile/plejliste'));assert.ok(!sitemaps.sitemapStaticPaths.includes('/listening-playlist'))
})
test('new discovery copy can render in English without translating song or artist records',async()=>{locale='en';const $=render(await home.default());assert.match($('header p').text(),/Find a guitar song/);const b=render(bio.default());assert.equal(b('h1').text(),'Artist biographies and discographies');locale='sr'})
