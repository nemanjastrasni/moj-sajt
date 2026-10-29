/* eslint-disable @typescript-eslint/no-require-imports -- Public content regression tests. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const content=require('../lib/about.ts'),{english}=require('../lib/i18n/messages.ts'),{translate}=require('../lib/i18n/index.ts'),{parentHref}=require('../lib/navigation/parent.ts')
const ROOT=path.resolve(__dirname,'..')
test('every public about paragraph, section and action has an English translation',()=>{
  const copy=[...Object.values(content).filter(value=>typeof value==='string'),...content.aboutSections.flatMap(section=>[section.title,...section.paragraphs,...section.links.map(link=>link.label)])]
  for(const text of copy){assert.ok(Object.hasOwn(english,text),text);assert.notEqual(translate('en',text),text);assert.equal(translate('sr',text),text)}
})
test('contents use unique safe anchors and existing feature routes',()=>{
  const ids=content.aboutSections.map(section=>section.id)
  assert.equal(new Set(ids).size,ids.length)
  for(const section of content.aboutSections){
    assert.match(section.id,/^[a-z][a-z-]+$/)
    assert.ok(section.paragraphs.length>=2)
    for(const {href} of section.links){
      assert.ok(href.startsWith('/')&&!href.startsWith('//'))
      assert.ok(fs.existsSync(path.join(ROOT,'app',href,'page.tsx')),href)
    }
  }
})
test('about and legacy URLs return to Contact instead of browser history',()=>{
  assert.equal(parentHref('/o-nama'),'/kontakt')
  assert.equal(parentHref('/about'),'/kontakt')
  const legacy=fs.readFileSync(path.join(ROOT,'app/about/page.tsx'),'utf8')
  assert.match(legacy,/redirect\("\/o-nama"\)/)
  assert.doesNotMatch(legacy,/useSession|ADMIN PANEL/)
})
test('Contact and the global footer link to the public about page',()=>{
  for(const file of ['app/kontakt/page.tsx','app/layout.tsx'])assert.match(fs.readFileSync(path.join(ROOT,file),'utf8'),/href="\/o-nama"/)
  const page=fs.readFileSync(path.join(ROOT,'app/o-nama/page.tsx'),'utf8')
  assert.doesNotMatch(page,/getServerSession|prisma|useSession|<form|<input/)
})

test('About screenshots are local readable images, with translated captions and no live user data',async()=>{
  const sharp=require('sharp')
  for(const file of ['plejlista.png','tonalitet-capo.png','moja-muzika.png']){
    const image=await sharp(path.join(ROOT,'public/guide',file)).metadata()
    assert.equal(image.format,'png');assert.ok(image.width>=800&&image.height>=300)
  }
  const component=fs.readFileSync(path.join(ROOT,'app/components/AboutScreenshot.tsx'),'utf8')
  assert.doesNotMatch(component,/useSession|fetch\(|prisma|user\.email/)
  assert.match(component,/unoptimized/)
})
