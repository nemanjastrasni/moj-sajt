/* eslint-disable @typescript-eslint/no-require-imports -- Render public song controls with isolated hooks and records. */
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',jsx:'react-jsx'}})
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),path=require('node:path')
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('cheerio')
const original=Module._load,root=path.resolve(__dirname,'..')
let extraLoads=0
Module._load=function(request,parent,main){
  if(request==='./SongExtraTools'){extraLoads++;throw Error('Extra tools must not load on initial song render')}
  if(request==='next/navigation')return{useRouter:()=>({push(){}})}
  if(request==='next/link')return{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}
  if(request==='./Engagement')return{useEngagement:()=>null}
  if(request==='./useSongKey')return{__esModule:true,default:()=>({transpose:0,controlsDisabled:false,change(){}})}
  if(request==='./usePlaylistSongSettings')return{__esModule:true,default:()=>({transpose:0,phase:'ready',controlsDisabled:false,change(){}})}
  if(request==='./useSongCapo')return{__esModule:true,default:(_id,lines,transpose)=>({lines,shift:transpose,active:false,selected:null,release(){}})}
  if(request==='./SongSheet')return{__esModule:true,default:()=>React.createElement('div',{'data-song-sheet':true},'Probni zapis')}
  if(request==='./CapoControl')return{__esModule:true,default:()=>React.createElement('button',null,'Capo')}
  if(request.endsWith('.css'))return new Proxy({},{get:(_target,key)=>key==='__esModule'?false:String(key)})
  if(request.startsWith('@/'))request=path.join(root,request.slice(2))
  return original.call(this,request,parent,main)
}
let SongClient
try{SongClient=require('../app/components/SongClient.tsx').default}finally{Module._load=original}
const song={id:'test',title:'Probna pesma',artist:'Probni bend',category:'domace',artistSlug:'bend',lyrics:'Am C G\nProbni stih.'}
test('initial public song puts its identity before controls and keeps optional tools out of initial HTML',()=>{
 const $=load(renderToStaticMarkup(React.createElement(SongClient,{song,songVersion:'fixture'})))
 assert.equal($('h1').length,1);assert.equal($('h1').text(),song.title)
 const html=$('body').html();assert.ok(html.indexOf('<h1')<html.indexOf('data-song-toolbar'))
 assert.ok($('[data-song-extra-tools]').is('[hidden]'))
 const toggle=$('button[aria-controls="'+$('[data-song-extra-tools]').attr('id')+'"]')
 assert.equal(toggle.attr('aria-expanded'),'false');assert.equal(toggle.text(),'Još alata')
 assert.ok($('button[aria-label="Povecaj tonalitet"]').length)
 assert.ok($('button[aria-label="Pokreni skrolovanje"]').length)
 assert.equal($('[data-song-video-toggle], iframe, dialog').length,0)
 assert.equal(extraLoads,0)
})
test('playlist navigation and public sheet remain available while optional tools are collapsed',()=>{
 const $=load(renderToStaticMarkup(React.createElement(SongClient,{song})))
 assert.equal($('[data-song-sheet]').text(),'Probni zapis')
 assert.equal($('a[translate="no"]').attr('href'),'/pesme/domace/bend')
})
