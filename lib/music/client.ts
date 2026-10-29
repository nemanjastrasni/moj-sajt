import { musicId, youtubeSource, type MusicList } from "./model"

export async function musicRequest(url:string,method="GET",body?:unknown,signal?:AbortSignal) {
  const deadline=new AbortController(),timer=setTimeout(()=>deadline.abort(),15000)
  const abort=()=>deadline.abort()
  signal?.addEventListener("abort",abort,{once:true})
  if(signal?.aborted)deadline.abort()
  try{
    const response=await fetch(url,{method,credentials:"same-origin",cache:"no-store",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,signal:deadline.signal})
    const value=await response.json().catch(()=>{throw Error("Muzika trenutno nije dostupna. Pokusaj ponovo.")})
    if(!response.ok)throw Object.assign(new Error(value.error||"Muzika trenutno nije dostupna. Pokusaj ponovo."),{status:response.status})
    return value
  }catch(error){
    if(error instanceof Error&&error.name==="AbortError"&&!signal?.aborted)throw Error("Zahtev traje predugo. Osvezi listu pre ponovnog pokusaja.")
    throw error
  }finally{clearTimeout(timer);signal?.removeEventListener("abort",abort)}
}
export function checkedMusic(value:unknown):MusicList {
  if(!value||typeof value!=="object")throw Error("Neispravni podaci muzicke liste.")
  const row=value as MusicList
  if(!musicId(row.id)||typeof row.name!=="string"||typeof row.isPublic!=="boolean"||typeof row.editable!=="boolean"||typeof row.version!=="string"||!/^[a-f0-9]{64}$/.test(row.version)||!Array.isArray(row.items)||row.items.length>500||new Set(row.items.map(item=>item?.id)).size!==row.items.length)throw Error("Neispravni podaci muzicke liste.")
  if(row.items.some(item=>!item||!musicId(item.id)||typeof item.url!=="string"||typeof item.title!=="string"||typeof item.type!=="string"))throw Error("Neispravni podaci muzicke liste.")
  return {...row,items:row.items.map(item=>({...item,source:youtubeSource(item.url)}))}
}
