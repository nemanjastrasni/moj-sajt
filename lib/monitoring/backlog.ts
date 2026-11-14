import { normalizeDiscography } from "@/lib/discography"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { getArtistImage } from "@/lib/artistPhotos"
import holds from "@/scripts/wiki-discography-holds.json"
import review from "./catalog-review-data.json"

export const backlogKinds = { sve:"Sve što nedostaje", bio:"Biografije", discography:"Diskografije", image:"Fotografije" } as const
export type BacklogKind = keyof typeof backlogKinds
export type BacklogRow = { id:string;name:string;slug:string;category:string|null;songs:number;missing:("bio"|"discography"|"image")[];reason:string|null }
const cachedBacklog=unstable_cache(async()=>{
  // Keep biographies out of this read. The shared display parser determines
  // whether discography contains actual releases rather than headings alone.
  const artists=await prisma.$queryRawUnsafe<{id:string;name:string;slug:string;category:string|null;image:string|null;discography:unknown;bioMissing:boolean;discographyMissing:boolean;songs:number}[]>('SELECT a.id,a.name,a.slug,a.category,a.image,a.discography,(a.bio IS NULL OR a.bio !~ \'[^[:space:]]\') AS "bioMissing",(a.discography IS NULL OR a.discography=\'null\'::jsonb OR a.discography=\'[]\'::jsonb OR jsonb_typeof(a.discography)=\'string\' AND (a.discography #>> \'{}\') !~ \'[^[:space:]]\') AS "discographyMissing",(SELECT count(*)::int FROM public."Song" s WHERE s."artistId"=a.id) AS songs FROM public."Artist" a ORDER BY a.id')
  const rows:BacklogRow[]=artists.map(a=>{
    const missing:BacklogRow["missing"]=[]
    if(a.bioMissing)missing.push("bio")
    if(!normalizeDiscography(a.discography).length)missing.push("discography")
    if(!getArtistImage(a))missing.push("image")
    const note=review.findings.find(f=>f.subjectId===a.id&&missing.includes(f.field as "bio"|"discography"|"image")&&f.title!=="Biografija nedostaje"&&f.title!=="Diskografija nedostaje"&&f.title!=="Fotografija nedostaje")
    return{id:a.id,name:a.name,slug:a.slug,category:a.category,songs:a.songs,missing,reason:note?.observed||(missing.includes("discography")&&holds.some(h=>h.name===a.name)?"Pripremljeni izvor zahteva proveru godina ili vrsta izdanja.":null)}
  })
  return{checkedAt:new Date().toISOString(),total:rows.length,counts:{bio:rows.filter(r=>r.missing.includes("bio")).length,discography:rows.filter(r=>r.missing.includes("discography")).length,image:rows.filter(r=>r.missing.includes("image")).length},rows:rows.filter(r=>r.missing.length)}
},["admin-complete-content-backlog-v2"],{revalidate:300,tags:["admin-content-backlog"]})
export async function readContentBacklog(){await requireSongAdmin();try{return await cachedBacklog()}catch{return null}}
export function backlogSelection(params:Record<string,unknown>){
  const kind:BacklogKind=typeof params.nedostaje==="string"&&Object.hasOwn(backlogKinds,params.nedostaje)?params.nedostaje as BacklogKind:"sve"
  const category=["domace","narodne","strane"].includes(String(params.kategorija))?String(params.kategorija):"sve"
  const query=typeof params.q==="string"?params.q.trim().slice(0,100):""
  const page=typeof params.lista==="string"&&/^\d{1,6}$/.test(params.lista)?Math.max(1,Number(params.lista)):1
  return{kind,category,query,page,sort:params.redosled==="naziv"?"naziv":"pesme"}
}
export function selectBacklog(rows:BacklogRow[],s:ReturnType<typeof backlogSelection>){
  const key=(v:string)=>v.normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase("sr-Latn").replace(/đ/g,"dj")
  return rows.filter(r=>(s.kind==="sve"||r.missing.includes(s.kind))&&(s.category==="sve"||r.category===s.category)&&key(r.name).includes(key(s.query))).sort((a,b)=>(s.sort==="pesme"?b.songs-a.songs:0)||a.name.localeCompare(b.name,"sr-Latn")||a.id.localeCompare(b.id))
}
export function backlogCsv(rows:BacklogRow[]){
  const cell=(v:unknown)=>'"'+String(v??"").replace(/^[\s]*[=+@-]/,m=>"'"+m).replace(/"/g,'""')+'"'
  return"\uFEFF"+[["Izvođač","Kategorija","Broj pesama","Nedostaje","Napomena","Profil","Editor"],...rows.map(r=>[r.name,r.category,r.songs,r.missing.map(f=>backlogKinds[f]).join(", "),r.reason,r.category?`/biografija/${encodeURIComponent(r.category)}/${encodeURIComponent(r.slug)}`:"",`/admin/artists/${encodeURIComponent(r.id)}/edit`])].map(row=>row.map(cell).join(";")).join("\r\n")
}
