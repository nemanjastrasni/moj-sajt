/* eslint-disable @typescript-eslint/no-require-imports -- Render localized public pages with read-only synthetic data. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path'),vm=require('node:vm')
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio')
const root=path.resolve(__dirname,'..'),original=Module._load
let pathname='/en',reads=0
Module._load=function(request,parent,main){
  if(request==='next/link')return{__esModule:true,default:props=>{const clean={...props};delete clean.prefetch;delete clean.scroll;return React.createElement('a',clean,clean.children)}}
  if(request==='next/navigation')return{usePathname:()=>pathname,useRouter:()=>({push(){}}),notFound:()=>{throw Object.assign(Error('Not found'),{status:404})}}
  if(request==='@/lib/prisma')return{prisma:new Proxy({},{get(){throw Error('Unexpected DB access')}})}
  if(request==='@/lib/homeSongsServer')return{getHomeSongs:async()=>{reads++;return[]}}
  if(request==='next/cache')return{unstable_cache:fn=>fn}
  if(/\/(Hero|HomeRepertoire|PopularSongs|LatestSongs|SiteImage|AboutScreenshot)$/.test(request))return{__esModule:true,default:()=>null}
  if(request.endsWith('.css'))return{__esModule:true,default:{}}
  if(request.startsWith('@/'))request=path.join(root,request.slice(2))
  return original.call(this,request,parent,main)
}
let home,about,chords,guides,detail,LocaleProvider,routes,maps,metadata,i18n
try{
  home=require('../app/en/page.tsx');about=require('../app/en/about/page.tsx');chords=require('../app/en/guitar-chords/page.tsx');guides=require('../app/en/guides/page.tsx');detail=require('../app/en/guides/[slug]/page.tsx');LocaleProvider=require('../app/components/LocaleProvider.tsx').default;routes=require('../lib/i18n/routes.ts');maps=require('../lib/seo/sitemaps.ts');metadata=require('../lib/seo/metadata.ts');i18n=require('../lib/i18n/index.ts')
}finally{Module._load=original}
const render=(url,node)=>{pathname=url;return load(renderToStaticMarkup(React.createElement(LocaleProvider,null,node)))}

test('translated route pairs round-trip with anchors and query strings without inventing unlocalized pages',()=>{
  const paths=new Set()
  for(const pair of routes.translatedRoutes){
    for(const lang of ['sr','en']){assert.ok(!paths.has(pair[lang]));paths.add(pair[lang]);assert.equal(routes.routeLocale(pair[lang]),lang);assert.equal(routes.localizedHref(pair.sr+'?from=guide#practice',lang),pair[lang]+'?from=guide#practice');assert.equal(routes.localizedHref(pair.en,'sr'),pair.sr)}
  }
  for(const value of ['/biografija/domace/probni-bend','/pesme/strane/band/song','/profile','https://example.test/','//example.test/','#practice'])assert.equal(routes.localizedHref(value,'en'),value)
  assert.equal(routes.routeLocale('/en/not-translated'),null)
  const {parentHref}=require('../lib/navigation/parent.ts')
  assert.equal(parentHref('/en'),null);assert.equal(parentHref('/en/about'),'/kontakt');assert.equal(parentHref('/en/guides/reading-guitar-chord-diagrams'),'/en/guides')
})
test('head initializer respects explicit language URLs over saved preferences even when storage is blocked',()=>{
  for(const pair of routes.translatedRoutes)for(const lang of ['sr','en'])for(const blocked of [false,true]){
    const root={dataset:{},lang:''}
    vm.runInNewContext(i18n.LOCALE_INIT_SCRIPT,{document:{documentElement:root},location:{pathname:pair[lang]},localStorage:{getItem(){if(blocked)throw Error('blocked');return lang==='en'?'sr':'en'}}})
    assert.equal(root.dataset.language,lang);assert.equal(root.lang,lang==='en'?'en':'sr-Latn')
  }
})
test('English homepage and About have translated main content and English feature links in server HTML',async()=>{
  reads=0
  let $=render('/en',await home.default())
  assert.equal($('h1').text(),'Guitar chords and song lyrics');assert.ok($('a[href="/en/guitar-chords"]').length);assert.ok($('a[href="/en/guides"]').length);assert.equal(reads,2)
  $=render('/en/about',about.default())
  assert.equal($('h1').text(),'About us');assert.match($('header p').text(),/guitar chords and song lyrics/);assert.match($('article').text(),/More tools opens/);assert.ok($('a[href="/en/guitar-chords"]').length)
  assert.doesNotMatch($('article').text(),/Sajt vodi|Pronađi|Mogućnosti sajta/)
  const source=render('/o-nama',about.default())
  assert.equal(source('h1').text(),'O nama');assert.match(source('header p').text(),/akordima za gitaru/)
})
test('English chord landing keeps all real diagrams and full English explanations',()=>{
  const $=render('/en/guitar-chords',chords.default())
  assert.equal($('h1').text(),'Guitar chords');assert.equal($('svg[role="img"]').length,8);assert.match($('p').text(),/standard.*tuning/);assert.match($('p').text(),/minor/)
  assert.ok($('a[href="/en/guides/reading-guitar-chord-diagrams"]').length)
})
test('all five English guides expose substantive translated text, working anchors and matching breadcrumbs',async()=>{
  const $index=render('/en/guides',guides.default());assert.equal($index('h1').text(),'Guitar guides')
  for(const {slug} of detail.generateStaticParams()){
    const url='/en/guides/'+slug,props={params:Promise.resolve({slug})},$=render(url,await detail.default(props)),meta=await detail.generateMetadata(props)
    assert.equal($('h1').text(),meta.title);assert.ok($('section p').text().length>1000);assert.ok($index(`a[href="${url}"]`).length)
    for(const anchor of $('a[href^="#"]').toArray())assert.equal($('[id="'+$(anchor).attr('href').slice(1)+'"]').length,1)
    assert.ok($('a[href="/en/guides"]').length)
    const json=JSON.parse($('script[type="application/ld+json"]').text());assert.equal(new URL(json.itemListElement.at(-1).item).pathname,url)
  }
  await assert.rejects(detail.default({params:Promise.resolve({slug:'missing'})}),error=>error.status===404)
})
test('every translated URL has a self canonical, reciprocal language alternates and one sitemap entry',async()=>{
  const $=load(await maps.sitemapPage('pages.xml'),{xml:true})
  for(const pair of routes.translatedRoutes){
    for(const lang of ['sr','en']){
      const meta=metadata.publicPageMetadata('Title','Description',pair[lang]);assert.equal(new URL(meta.alternates.canonical).pathname,pair[lang]);assert.equal(new URL(meta.alternates.languages.en).pathname,pair.en);assert.equal(new URL(meta.alternates.languages['sr-Latn']).pathname,pair.sr);assert.equal(new URL(meta.alternates.languages['x-default']).pathname,pair.sr)
      assert.equal($('loc').toArray().filter(node=>new URL($(node).text()).pathname===pair[lang]).length,1)
      assert.equal(meta.openGraph.locale,lang==='en'?'en_US':'sr_RS')
    }
  }
  assert.equal(metadata.publicPageMetadata('Artist','Original bio','/biografija/domace/bend').alternates.languages,undefined)
})
