"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { ArrowDown,ArrowUp,ExternalLink,Headphones,Lock,Pencil,Play,Plus,RefreshCw,Save,Share2,Trash2,Users } from "lucide-react"
import { externalMusicUrl,musicCategories,type MusicList } from "@/lib/music/model"
import { checkedMusic,musicRequest } from "@/lib/music/client"
import { getCategoryLabel } from "@/lib/categories"
import { useI18n } from "./UiText"
import { useMusic } from "./MusicContext"
import PlaylistDialog from "./PlaylistDialog"
import styles from "./Music.module.css"

export default function MusicPlaylist({initial,viewerId}:{initial:MusicList;viewerId:string|null}){
  const {t,locale}=useI18n(),router=useRouter(),music=useMusic(),{data:session,status}=useSession()
  const [list,setList]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("")
  const [url,setUrl]=useState(""),[title,setTitle]=useState(""),[edit,setEdit]=useState(false),[removeId,setRemoveId]=useState<string|null>(null)
  const [name,setName]=useState(initial.name),[category,setCategory]=useState(initial.category||"Mix"),[isPublic,setPublic]=useState(initial.isPublic)
  const editable=list.editable&&status==="authenticated"&&session?.user?.id===viewerId
  if(!list.isPublic&&status!=="loading"&&session?.user?.id!==viewerId)return <p className={styles.error}>{t("Muzicka lista nije dostupna.")}</p>
  function accept(value:unknown){const next=checkedMusic(value);if(next.id!==list.id)throw Error("Neispravni podaci muzicke liste.");setList(next);music.reconcile(next);return next}
  async function update(endpoint:string,method:string,body:Record<string,unknown>){
    if(busy)return false
    setBusy(true);setError("");setNotice("")
    try{const result=await musicRequest(endpoint,method,{...body,version:list.version});accept(result.playlist);router.refresh();return true}
    catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.");return false}
    finally{setBusy(false)}
  }
  const base="/api/listening-playlist/"+encodeURIComponent(list.id)
  return <section className={styles.page}>
    <div className={styles.heading}><h1 translate="no">{list.name}</h1><Headphones aria-hidden="true" size={24} /></div>
    <p className={styles.notice+" "+styles.muted}>{getCategoryLabel(list.category,locale)} · {t(list.isPublic?"Javna lista":"Privatna lista")} · {list.items.length} {t("stavki")}</p>
    <div className={styles.tabs}>
      <button type="button" className="ui-button ui-button-primary" disabled={!list.items.some(item=>item.source)||music.loading} onClick={()=>void music.start(list.id)}><Play aria-hidden="true" />{t("Pusti listu")}</button>
      {editable&&<button type="button" className="ui-button" onClick={()=>{setName(list.name);setCategory(list.category||"Mix");setPublic(list.isPublic);setError("");setEdit(true)}}><Pencil aria-hidden="true" />{t("Izmeni listu")}</button>}
      {list.isPublic&&<button type="button" className="ui-button" onClick={async()=>{
        try{await navigator.clipboard.writeText(location.origin+"/listening-playlist/"+encodeURIComponent(list.id));setNotice("Link playliste je kopiran")}
        catch{setError("Kopiranje nije uspelo. Kopiraj adresu iz pregledaca.")}
      }}><Share2 aria-hidden="true" />{t("Podeli")}</button>}
      <Link href="/biografija" className="ui-button">{t("Citaj biografije")}</Link>
    </div>
    {editable&&<form className={styles.fields} onSubmit={async event=>{event.preventDefault();if(await update("/api/listening-playlist/item","POST",{playlistId:list.id,url,title})){setUrl("");setTitle("")}}}><fieldset disabled={busy}>
      <label>YouTube link<input type="url" required maxLength={2000} value={url} onChange={event=>setUrl(event.target.value)} className="ui-input" /></label>
      <label>{t("Naziv snimka (neobavezno)")}<input maxLength={200} value={title} onChange={event=>setTitle(event.target.value)} className="ui-input" /></label>
      <button type="submit" className="ui-button"><Plus aria-hidden="true" />{t(busy?"Cuvam...":"Dodaj link")}</button>
    </fieldset></form>}
    {notice&&<p role="status" className={styles.notice}>{t(notice)}</p>}
    {error&&!edit&&!removeId&&<div role="alert" className={styles.error}><p>{t(error)}</p><button type="button" disabled={busy} className="ui-button mt-3" onClick={async()=>{
      setBusy(true)
      try{const result=await musicRequest(base);accept(result.playlist);setError("")}
      catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}
      finally{setBusy(false)}
    }}><RefreshCw aria-hidden="true" />{t("Osvezi listu")}</button></div>}
    {!list.items.length?<p className={styles.muted}>{t("Ova muzicka lista je prazna.")}</p>:<ol className={styles.rows}>{list.items.map((item,index)=>{
      const external=externalMusicUrl(item.url)
      return <li key={item.id} className={styles.row} data-playing={music.queue?.list.id===list.id&&music.queue.currentId===item.id}>
        {item.source?<button type="button" className={styles.icon} title={t("Pokreni muziku")+": "+item.title} aria-label={t("Pokreni muziku")+": "+item.title} onClick={()=>void music.start(list.id,item.id)}><Play /></button>:<span className={styles.muted}>{index+1}.</span>}
        <div className={styles.identity}><strong translate="no">{item.title||item.type}</strong><small>{item.source?<span>YouTube{item.source.kind==="playlist"?" playlist":""}</span>:external?<a href={external} target="_blank" rel="noopener"><ExternalLink size={14} aria-hidden="true" />{t("Otvori izvor")}</a>:<span>{t("Ovaj stari link nije podrzan u plejeru.")}</span>}</small></div>
        {editable&&<div className={styles.commands}>
          {[[-1,ArrowUp,"Pomeri stavku gore"],[1,ArrowDown,"Pomeri stavku dole"]].map(([direction,Icon,label])=>{
            const amount=direction as number,Symbol=Icon as typeof ArrowUp
            return <button key={amount} type="button" className={styles.icon} disabled={busy||index+amount<0||index+amount>=list.items.length} title={t(label as string)} aria-label={t(label as string)} onClick={()=>{
              const ids=list.items.map(item=>item.id);[ids[index],ids[index+amount]]=[ids[index+amount],ids[index]];void update("/api/listening-playlist/reorder","PUT",{playlistId:list.id,items:ids})
            }}><Symbol /></button>
          })}
          <button type="button" className={styles.icon+" ui-button-danger"} disabled={busy} title={t("Ukloni stavku")} aria-label={t("Ukloni stavku")+": "+item.title} onClick={()=>{setError("");setRemoveId(item.id)}}><Trash2 /></button>
        </div>}
      </li>
    })}</ol>}
    {edit&&<PlaylistDialog title="Izmeni listu" close={()=>setEdit(false)} busy={busy}><form className={styles.dialogForm} onSubmit={async event=>{event.preventDefault();if(await update(base,"PATCH",{name,category,isPublic}))setEdit(false)}}>
      <label>{t("Naziv muzicke liste")}<input className="ui-input" required maxLength={120} disabled={busy} value={name} onChange={event=>setName(event.target.value)} /></label>
      <label>{t("Kategorija")}<select className="ui-input" disabled={busy} value={category} onChange={event=>setCategory(event.target.value)}>{musicCategories.map(value=><option value={value} key={value}>{getCategoryLabel(value,locale)}</option>)}</select></label>
      <label className={styles.check}><input type="checkbox" disabled={busy} checked={isPublic} onChange={event=>setPublic(event.target.checked)} />{isPublic?<Users aria-hidden="true" size={16} />:<Lock aria-hidden="true" size={16} />}{t("Javna lista")}</label>
      {error&&<p role="alert" className={styles.error}>{t(error)}</p>}
      <div className={styles.commands}><button type="button" className="ui-button" disabled={busy} onClick={()=>setEdit(false)}>{t("Otkazi")}</button><button type="submit" className="ui-button ui-button-primary" disabled={busy}><Save aria-hidden="true" />{t(busy?"Cuvam...":"Sacuvaj")}</button></div>
    </form></PlaylistDialog>}
    {removeId&&<PlaylistDialog title="Ukloni stavku" close={()=>setRemoveId(null)} busy={busy}><p className={styles.notice} translate="no">{list.items.find(item=>item.id===removeId)?.title}</p>{error&&<p role="alert" className={styles.error}>{t(error)}</p>}<div className={styles.commands}><button type="button" className="ui-button" disabled={busy} onClick={()=>setRemoveId(null)}>{t("Otkazi")}</button><button type="button" className="ui-button ui-button-destructive" disabled={busy} onClick={async()=>{if(await update("/api/listening-playlist/item/"+encodeURIComponent(removeId),"DELETE",{}))setRemoveId(null)}}><Trash2 aria-hidden="true" />{t(busy?"Brisem...":"Potvrdi brisanje")}</button></div></PlaylistDialog>}
  </section>
}
