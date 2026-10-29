"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Headphones,Lock,Play,Plus,Trash2,Users } from "lucide-react"
import type { MusicList,MusicSummary } from "@/lib/music/model"
import { musicCategories } from "@/lib/music/model"
import { checkedMusic,musicRequest } from "@/lib/music/client"
import { getCategoryLabel } from "@/lib/categories"
import { useMusic } from "./MusicContext"
import { useI18n } from "./UiText"
import PlaylistDialog from "./PlaylistDialog"
import styles from "./Music.module.css"
import LikePlaylistButton from "./LikePlaylistButton"

export default function MusicCatalog({lists,owned,page=1,category="",top=false}:{lists:MusicSummary[];owned:boolean;page?:number;category?:string;top?:boolean}){
  const {t,locale}=useI18n(),router=useRouter(),music=useMusic()
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[removed,setRemoved]=useState<string[]>([]),[target,setTarget]=useState<MusicList|null>(null)
  const [name,setName]=useState(""),[newCategory,setNewCategory]=useState("Mix"),[isPublic,setPublic]=useState(false)
  async function remove(){
    if(!target||busy)return
    setBusy(true);setError("")
    try{await musicRequest("/api/listening-playlist/"+encodeURIComponent(target.id),"DELETE",{version:target.version});if(music.queue?.list.id===target.id)music.stop();setRemoved(ids=>[...ids,target.id]);setTarget(null);router.refresh()}
    catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}
    finally{setBusy(false)}
  }
  const categoryHref=(value:string,nextPage=1)=>"/public-listening-playlists?"+new URLSearchParams({...(value?{category:value}:{}),...(top?{top:"1"}:{}),page:String(nextPage)})
  return <section className={styles.page}>
    <div className={styles.heading}><h1>{t(owned?"Moja muzika":"Javne muzicke liste")}</h1><Headphones aria-hidden="true" size={24} /></div>
    <nav className={styles.tabs} aria-label={t("Muzicke liste")}><Link className="ui-button" href="/listening-playlist" aria-current={owned?"page":undefined}>{t("Moja muzika")}</Link><Link className="ui-button" href="/public-listening-playlists" aria-current={!owned?"page":undefined}>{t("Javne muzicke liste")}</Link><Link className="ui-button" href="/biografija">{t("Biografije i diskografije")}</Link></nav>
    {owned?<form className={styles.fields} onSubmit={async event=>{
      event.preventDefault();if(busy)return
      setBusy(true);setError("")
      try{const data=await musicRequest("/api/listening-playlist","POST",{name,category:newCategory,isPublic});const list=checkedMusic(data.playlist);router.push("/listening-playlist/"+encodeURIComponent(list.id));router.refresh()}
      catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}
      finally{setBusy(false)}
    }}><fieldset disabled={busy}>
      <label>{t("Naziv muzicke liste")}<input className="ui-input" required maxLength={120} value={name} onChange={event=>setName(event.target.value)} /></label>
      <label>{t("Kategorija")}<select className="ui-input" value={newCategory} onChange={event=>setNewCategory(event.target.value)}>{musicCategories.map(value=><option key={value} value={value}>{getCategoryLabel(value,locale)}</option>)}</select></label>
      <label className={styles.check}><input type="checkbox" checked={isPublic} onChange={event=>setPublic(event.target.checked)} />{t("Javna lista")}</label>
      <button type="submit" className="ui-button ui-button-primary"><Plus aria-hidden="true" />{t(busy?"Cuvam...":"Kreiraj listu")}</button>
    </fieldset></form>:<nav className={styles.tabs} aria-label={t("Kategorija")}><Link href={categoryHref("")} className="ui-button" aria-current={!category?"page":undefined}>{t("Sve")}</Link>{musicCategories.map(value=><Link href={categoryHref(value)} key={value} className="ui-button" aria-current={category===value?"page":undefined}>{getCategoryLabel(value,locale)}</Link>)}</nav>}
    {error&&!target&&<p role="alert" className={styles.error}>{t(error)}</p>}
    {!lists.filter(list=>!removed.includes(list.id)).length?<p className={styles.muted}>{t("Nema muzickih lista u ovom pregledu.")}</p>:<ul className={styles.rows}>{lists.filter(list=>!removed.includes(list.id)).map(list=><li key={list.id} className={styles.row}>
      <button type="button" className={styles.icon} disabled={!list.count||music.loading} title={t("Pusti listu")} aria-label={t("Pusti listu")+": "+list.name} onClick={()=>void music.start(list.id)}><Play /></button>
      <div className={styles.identity}><Link href={"/listening-playlist/"+encodeURIComponent(list.id)} prefetch={false}>{list.name}</Link><small><span>{list.count} {t("stavki")}</span><span>{getCategoryLabel(list.category,locale)}</span><span>{list.isPublic?<Users size={14} aria-hidden="true" />:<Lock size={14} aria-hidden="true" />}{t(list.isPublic?"Javna lista":"Privatna lista")}</span>{!owned&&list.author&&<span>{list.author}</span>}</small></div>
      {owned&&<button type="button" className={styles.icon+" ui-button-danger"} disabled={busy} title={t("Obrisi muzicku listu")} aria-label={t("Obrisi muzicku listu")+": "+list.name} onClick={async()=>{
        setBusy(true);setError("")
        try{const data=await musicRequest("/api/listening-playlist/"+encodeURIComponent(list.id));setTarget(checkedMusic(data.playlist))}
        catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}
        finally{setBusy(false)}
      }}><Trash2 /></button>}
      {!owned&&<LikePlaylistButton playlistId={list.id} initialLiked={list.liked} initialCount={list.likes} />}
    </li>)}</ul>}
    {!owned&&!top&&<nav className={styles.pagination} aria-label={t("Stranice muzickih lista")}>{page>1?<Link className="ui-button" href={categoryHref(category,page-1)}>{t("Prethodna")}</Link>:<span />}{lists.length===50&&<Link className="ui-button" href={categoryHref(category,page+1)}>{t("Sledeca")}</Link>}</nav>}
    {target&&<PlaylistDialog title="Obrisi muzicku listu" close={()=>setTarget(null)} busy={busy}><p className={styles.notice}><strong translate="no">{target.name}</strong></p><p className={styles.notice}>{t("Brise se muzicka lista sa svojim linkovima. Pesme sa akordima i druge liste ostaju.")}</p>{error&&<p role="alert" className={styles.error}>{t(error)}</p>}<div className={styles.commands}><button type="button" className="ui-button" disabled={busy} onClick={()=>setTarget(null)}>{t("Otkazi")}</button><button type="button" className="ui-button ui-button-destructive" disabled={busy} onClick={()=>void remove()}><Trash2 aria-hidden="true" />{t(busy?"Brisem...":"Potvrdi brisanje")}</button></div></PlaylistDialog>}
  </section>
}
