import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { refreshArtistContent } from "@/lib/adminContent/server"
import { revalidatePath,revalidateTag } from "next/cache"
import { SubmissionError } from "@/lib/submissions/validation"
import * as core from "@/scripts/lib/admin-content-actions.cjs"
import { buildCandidate } from "@/scripts/lib/admin-content-candidate.cjs"
import type { Prisma } from "@prisma/client"
export type Proposal={id:string;findingId:string;subjectId:string;field:"bio"|"discography"|"finding";operation:string;status:string;createdAt:string;data:{identity?:{name:string;slug:string;category:string|null};before:unknown;after:unknown;source?:{revisionUrl:string;title:string;license:string;language:string};ai?:{status:string;message?:string;explanation?:string;needsReview?:boolean};note?:string}}
const adapter=(tx:Prisma.TransactionClient)=>({query:async(sql:string,params:unknown[]=[])=>{
 if(/^\s*(SELECT|WITH)/i.test(sql)||/RETURNING/i.test(sql)) {const rows=await tx.$queryRawUnsafe<Record<string,unknown>[]>(sql,...params);return{rows,rowCount:rows.length}}
 return{rows:[],rowCount:await tx.$executeRawUnsafe(sql,...params)}
}})
async function transaction<T>(work:(db:ReturnType<typeof adapter>)=>Promise<T>){return prisma.$transaction(tx=>work(adapter(tx)),{timeout:15000})}
function field(value:unknown){if(value!=="bio"&&value!=="discography")throw new SubmissionError(400,"Izaberi biografiju ili diskografiju.");return value}
function id(value:unknown){if(typeof value!=="string"||!/^[a-zA-Z0-9_-]{1,180}$/.test(value))throw new SubmissionError(400,"Neispravna oznaka.");return value}
function refresh(a?:{slug:string;category:string|null}){if(a)refreshArtistContent(a);try{revalidateTag("admin-content-backlog");revalidateTag("admin-catalog-review");revalidatePath("/admin/nadzor");revalidatePath("/wiki-izvori")}catch{}}
export async function contentAction(actorId:string,input:Record<string,unknown>){
 try{
 if(input.action==="prepare"){
  const f=field(input.field),sourceUrl=typeof input.sourceUrl==="string"?input.sourceUrl.trim():"";if(sourceUrl.length>1000)throw new SubmissionError(400,"Link je predugačak.")
  const reserved=await transaction(db=>core.reserve(db,actorId,{subjectId:id(input.subjectId),findingId:id(input.findingId),field:f}))
  let candidate:Awaited<ReturnType<typeof buildCandidate>>|undefined,error:string|undefined
  try{candidate=await buildCandidate(reserved.artist,f,{sourceUrl,confirmIdentity:input.confirmIdentity===true,useAI:input.useAI===true})}catch(e){error=e instanceof core.ActionError?e.message:"Wikipedia provera trenutno nije dostupna. Pokušaj ponovo ili unesi sadržaj ručno."}
  const result=await transaction(db=>core.complete(db,reserved.id,actorId,candidate,error));refresh();return result
 }
 if(input.action==="clear"){const result=await transaction(db=>core.clearProposal(db,actorId,{findingId:id(input.findingId)}));refresh();return result}
 if(input.action==="decision"){const result=await transaction(db=>core.decision(db,actorId,{findingId:id(input.findingId),decision:input.decision,currentVersion:input.currentVersion}));refresh();return result}
 if(["apply","undo","discard"].includes(String(input.action))){
  if(input.action!=="discard"&&(input.approved!==true||typeof input.confirmation!=="string"||input.confirmation.length>200))throw new SubmissionError(400,"Potvrdi izvor i upiši naziv izvođača.")
  const result=await transaction(db=>input.action==="apply"?core.apply(db,actorId,id(input.id),input.confirmation):input.action==="undo"?core.undo(db,actorId,id(input.id),input.confirmation):core.discard(db,actorId,id(input.id)))
  refresh(result.artist);return result
 }
 throw new SubmissionError(400,"Nepoznata akcija.")
 }catch(error){if(error instanceof core.ActionError)throw new SubmissionError(error.status,error.message);throw error}
}
export async function readProposals(findingId?:string){
 await requireSongAdmin()
 try{
  const rows=await prisma.$queryRawUnsafe<Proposal[]>(findingId?'SELECT * FROM public."AdminContentProposal" WHERE "findingId"=$1 ORDER BY "createdAt" DESC,id DESC LIMIT 10':'SELECT id,"findingId","subjectId",field,operation,status,"createdAt",jsonb_build_object(\'identity\',data->\'identity\',\'note\',data->\'note\',\'decision\',data->\'decision\') AS data FROM public."AdminContentProposal" ORDER BY "createdAt" DESC,id DESC LIMIT 20',...(findingId?[id(findingId)]:[]))
  return{state:"ready" as const,rows:JSON.parse(JSON.stringify(rows)) as Proposal[]}
 }catch{return{state:"unavailable" as const,rows:[] as Proposal[]}}
}
export async function readProposal(idValue:string){await requireSongAdmin();const rows=await prisma.$queryRawUnsafe<Proposal[]>('SELECT * FROM public."AdminContentProposal" WHERE id=$1',id(idValue));return rows[0]?JSON.parse(JSON.stringify(rows[0])) as Proposal:null}
export type ActionEvent={id:string;proposalId:string;action:string;createdAt:string;actorName:string;name:string|null;findingId:string;status:string}
export async function readFindingDecisions(){
 await requireSongAdmin()
 try{
  const rows=await prisma.$queryRawUnsafe<{findingId:string;operation:string;currentVersion:string|null}[]>('SELECT DISTINCT ON ("findingId") "findingId",operation,data->>\'currentVersion\' AS "currentVersion" FROM public."AdminContentProposal" WHERE field=\'finding\' ORDER BY "findingId","createdAt" DESC,id DESC')
  return Object.fromEntries(rows.map(row=>[row.findingId,{operation:row.operation,currentVersion:row.currentVersion}])) as Record<string,{operation:string;currentVersion:string|null}>
 }catch{return{} as Record<string,{operation:string;currentVersion:string|null}>}
}
export async function readActionEvents(){await requireSongAdmin();try{const rows=await prisma.$queryRawUnsafe<ActionEvent[]>('SELECT e.id,e."proposalId",e.action,e."createdAt",COALESCE(u.name,e."actorId") AS "actorName",p.data->\'identity\'->>\'name\' AS name,p."findingId",p.status FROM public."AdminContentEvent" e JOIN public."AdminContentProposal" p ON p.id=e."proposalId" LEFT JOIN public."User" u ON u.id=e."actorId" ORDER BY e."createdAt" DESC,e.id DESC LIMIT 50');return{state:"ready" as const,rows:JSON.parse(JSON.stringify(rows)) as ActionEvent[]}}catch{return{state:"unavailable" as const,rows:[] as ActionEvent[]}}}
