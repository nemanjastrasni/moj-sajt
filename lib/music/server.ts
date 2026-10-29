import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { playlistBody, playlistTransaction, playlistViewerId, privateHeaders } from "@/lib/playlists/server"
import { submissionUser } from "@/lib/submissions/server"
import { SubmissionError } from "@/lib/submissions/validation"
import { NextResponse } from "next/server"
import { canonicalYoutube, expectedVersion, MusicError, musicCategory, musicId, musicName, youtubeSource, type MusicList, type MusicSummary } from "./model"

export { privateHeaders, playlistViewerId as musicViewerId }
const itemOrder: Prisma.ListeningItemOrderByWithRelationInput[] = [{order:"asc"},{id:"asc"}]
export const musicSelect = { id:true,name:true,userId:true,category:true,isPublic:true,items:{orderBy:itemOrder,select:{id:true,title:true,url:true,type:true,order:true}} } satisfies Prisma.ListeningPlaylistSelect
type Row = Prisma.ListeningPlaylistGetPayload<{select:typeof musicSelect}>
export function musicVersion(row: Row) {
  return createHash("sha256").update(JSON.stringify([row.id,row.userId,row.name,row.category,row.isPublic,row.items.map(item=>[item.id,item.title,item.url,item.type,item.order])])).digest("hex")
}
export function musicView(row: Row, viewerId: string | null): MusicList {
  return { id:row.id,name:row.name,category:row.category,isPublic:row.isPublic,editable:Boolean(viewerId&&row.userId===viewerId),version:musicVersion(row),items:row.items.map(item=>({id:item.id,title:item.title||"YouTube",url:item.url,type:item.type,order:item.order,source:youtubeSource(item.url)})) }
}
export async function readableMusic(id: string, viewerId: string | null) {
  if(!musicId(id))throw new MusicError(404,"Muzicka lista nije dostupna.")
  const row=await prisma.listeningPlaylist.findFirst({where:{id,OR:[{isPublic:true},...(viewerId?[{userId:viewerId}]:[])]},select:musicSelect})
  if(!row)throw new MusicError(404,"Muzicka lista nije dostupna.")
  return musicView(row,viewerId)
}
export async function musicCatalog({userId,viewerId,category,page=1,limit=50}:{userId?:string;viewerId?:string|null;category?:string;page?:number;limit?:number}={}):Promise<MusicSummary[]> {
  const rows=await prisma.listeningPlaylist.findMany({where:{...(userId?{userId}:{isPublic:true}),...(category&&category!=="admin"?{category}:{}),...(category==="admin"?{user:{is:{role:"admin",banned:false}}}: {})},orderBy:userId?[{createdAt:"desc"},{id:"asc"}]:[{views:"desc"},{id:"asc"}],skip:(page-1)*limit,take:limit,
    select:{id:true,name:true,category:true,isPublic:true,views:true,user:{select:{name:true}},likes:{where:{userId:viewerId||userId||"__no_viewer__"},select:{id:true},take:1},_count:{select:{items:true,likes:true}}}})
  return rows.map(row=>({id:row.id,name:row.name,category:row.category,isPublic:row.isPublic,views:row.views,count:row._count.items,likes:row._count.likes,liked:Boolean(row.likes.length),author:row.user?.name||null}))
}
export async function musicBody(request: Request) { return playlistBody(request) }
export function musicFailure(error: unknown) {
  const known=error instanceof MusicError||error instanceof SubmissionError
  const status=known?error.status:error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2025"?404:503
  return NextResponse.json({error:known?error.message:status===404?"Muzicka lista nije dostupna.":"Muzika trenutno nije dostupna. Pokusaj ponovo."},{status,headers:privateHeaders})
}
async function owner(tx:Prisma.TransactionClient,id:string,userId:string,version?:unknown) {
  const actor=await tx.user.findUnique({where:{id:userId},select:{id:true,banned:true}})
  if(!actor||actor.banned)throw new MusicError(403,"Pristup nije dozvoljen.")
  const row=await tx.listeningPlaylist.findFirst({where:{id,userId},select:musicSelect})
  if(!row)throw new MusicError(404,"Muzicka lista nije dostupna.")
  if(version!==undefined&&expectedVersion(version)!==musicVersion(row))throw new MusicError(409,"Lista je u medjuvremenu izmenjena. Osvezi prikaz.")
  return row
}
export async function createMusic(input:Record<string,unknown>) {
  const actor=await submissionUser(),name=musicName(input.name),category=musicCategory(input.category??"Mix")
  if(input.isPublic!==undefined&&typeof input.isPublic!=="boolean")throw new MusicError(400,"Neispravna vidljivost liste.")
  return playlistTransaction(async tx=>{
    const current=await tx.user.findUnique({where:{id:actor.id},select:{id:true,banned:true}})
    if(!current||current.banned)throw new MusicError(403,"Pristup nije dozvoljen.")
    if(await tx.listeningPlaylist.count({where:{userId:actor.id}})>=100)throw new MusicError(400,"Mozes imati najvise 100 muzickih lista.")
    const row=await tx.listeningPlaylist.create({data:{name,category,userId:actor.id,isPublic:input.isPublic===true},select:musicSelect})
    return musicView(row,actor.id)
  })
}
export async function mutateMusic(id:string,input:Record<string,unknown>,operation:"edit"|"delete"|"add"|"reorder"|"remove",itemId?:string) {
  const actor=await submissionUser()
  if(!musicId(id))throw new MusicError(404,"Muzicka lista nije dostupna.")
  const version=expectedVersion(input.version)
  return playlistTransaction(async tx=>{
    const row=await owner(tx,id,actor.id,version)
    if(operation==="delete") {
      await tx.listeningPlaylistLike.deleteMany({where:{playlistId:id}})
      await tx.listeningItem.deleteMany({where:{playlistId:id}})
      await tx.listeningPlaylist.delete({where:{id}})
      return null
    }
    if(operation==="edit") {
      if(typeof input.isPublic!=="boolean")throw new MusicError(400,"Neispravna vidljivost liste.")
      await tx.listeningPlaylist.update({where:{id},data:{name:musicName(input.name),category:musicCategory(input.category),isPublic:input.isPublic}})
    }
    if(operation==="add") {
      const source=youtubeSource(input.url)
      if(!source)throw new MusicError(400,"Unesi vazeci HTTPS YouTube video ili playlist link.")
      const url=canonicalYoutube(source)
      if(row.items.length>=500)throw new MusicError(400,"Lista moze imati najvise 500 stavki.")
      if(row.items.some(item=>{const source=youtubeSource(item.url);return source&&canonicalYoutube(source)===url}))throw new MusicError(409,"Ovaj YouTube link je vec na listi.")
      const title=typeof input.title==="string"?input.title.trim():""
      if(title.length>200||/[\u0000-\u001f\u007f]/.test(title))throw new MusicError(400,"Naziv snimka moze imati najvise 200 znakova.")
      await tx.listeningItem.create({data:{playlistId:id,url,type:"youtube",title:title||(source.kind==="video"?"YouTube ":"YouTube playlist ")+source.id,order:Math.max(-1,...row.items.map(item=>item.order))+1}})
    }
    if(operation==="remove") {
      if(!row.items.some(item=>item.id===itemId))throw new MusicError(404,"Stavka nije dostupna.")
      await tx.listeningItem.delete({where:{id:itemId!}})
    }
    if(operation==="reorder") {
      const ids=input.items
      if(!Array.isArray(ids)||ids.length!==row.items.length||ids.some(id=>!musicId(id))||new Set(ids).size!==ids.length||row.items.some(item=>!ids.includes(item.id)))throw new MusicError(400,"Redosled mora sadrzati samo sve stavke ove liste.")
      for(const [order,item] of ids.entries())await tx.listeningItem.update({where:{id:item},data:{order}})
    }
    const after=await tx.listeningPlaylist.findFirst({where:{id,userId:actor.id},select:musicSelect})
    if(!after)throw new MusicError(404,"Muzicka lista nije dostupna.")
    return musicView(after,actor.id)
  })
}
export async function removeMusicItem(itemId:string,input:Record<string,unknown>) {
  await submissionUser()
  if(!musicId(itemId))throw new MusicError(404,"Stavka nije dostupna.")
  const item=await prisma.listeningItem.findUnique({where:{id:itemId},select:{playlistId:true}})
  if(!item)throw new MusicError(404,"Stavka nije dostupna.")
  return mutateMusic(item.playlistId,input,"remove",itemId)
}
