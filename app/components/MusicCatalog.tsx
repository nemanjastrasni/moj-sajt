"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical,Headphones,Lock,Pencil,Play,Plus,Trash2,Users } from "lucide-react"
import type { MusicList,MusicSummary } from "@/lib/music/model"
import { musicCategories } from "@/lib/music/model"
import { checkedMusic,musicRequest } from "@/lib/music/client"
import { getCategoryLabel } from "@/lib/categories"
import { useMusic } from "./MusicContext"
import { useI18n } from "./UiText"
import PlaylistDialog from "./PlaylistDialog"
import PlaylistNameDialog from "./PlaylistNameDialog"
import styles from "./Music.module.css"
import LikePlaylistButton from "./LikePlaylistButton"
import GuideText from "./GuideText"

export default function MusicCatalog({lists,owned,page=1,category="",top=false}:{lists:MusicSummary[];owned:boolean;page?:number;category?:string;top?:boolean}){
  const {t,locale}=useI18n(),router=useRouter(),music=useMusic()
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[removed,setRemoved]=useState<string[]>([]),[target,setTarget]=useState<MusicList|null>(null)
  const [name,setName]=useState(""),[newCategory,setNewCategory]=useState("Mix"),[isPublic,setPublic]=useState(false)
  const [editMode,setEditMode]=useState<"rename"|"remove">("remove")
  const [notice,setNotice]=useState("")
  const [manualOrder,setManualOrder]=useState<{against:string;items:string[]}|null>(null)
  const [renamed,setRenamed]=useState<Record<string,{from:string;name:string}>>({})
  const sorting=useRef(false)
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}))
  const visible=lists.filter(list=>!removed.includes(list.id))
  const orderKey=visible.map(list=>list.id).join(",")
  if(manualOrder?.against===orderKey){
    const positions=new Map(manualOrder.items.map((id,index)=>[id,index]))
    visible.sort((a,b)=>positions.get(a.id)!-positions.get(b.id)!)
  }

  async function openEdit(id:string,mode:"rename"|"remove"){
    if(busy||sorting.current)return
    setBusy(true);setError("");setNotice("")
    try{
      const {playlist}=await musicRequest("/api/listening-playlist/"+encodeURIComponent(id))
      const list=checkedMusic(playlist)
      if(list.id!==id||!list.editable)throw Error("Muzicka lista nije dostupna.")
      setEditMode(mode);setTarget(list)
    }catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}
    finally{setBusy(false)}
  }

  async function rename(target:MusicList,value:string){
    const base="/api/listening-playlist/"+encodeURIComponent(target.id)
    const {playlist}=await musicRequest(base+"/rename","PATCH",{name:value,version:target.version})
    const next=checkedMusic(playlist)
    if(next.id!==target.id||!next.editable)throw Error("Neispravni podaci muzicke liste.")
    const original=lists.find(list=>list.id===next.id)?.name??target.name
    setRenamed(names=>({...names,[next.id]:{from:original,name:next.name}}))
    music.reconcile(next)
    router.refresh()
  }

  async function dragEnd({active,over}:DragEndEvent){
    if(!owned||busy||sorting.current||!over||active.id===over.id)return
    const previous=visible.map(list=>list.id),from=previous.indexOf(String(active.id)),to=previous.indexOf(String(over.id))
    if(from<0||to<0)return
    const items=arrayMove(previous,from,to),before=manualOrder
    sorting.current=true
    setBusy(true);setError("");setNotice("");setManualOrder({against:orderKey,items})
    try{
      const result=await musicRequest("/api/listening-playlist/catalog-order","PUT",{previous,items})
      if(!Array.isArray(result.items)||result.items.length!==items.length||items.some((id,index)=>result.items[index]!==id))throw Error("Neispravni podaci muzicke liste.")
      setNotice("Redosled je sacuvan.")
    }catch(cause){
      setManualOrder(before)
      setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")
    }finally{sorting.current=false;setBusy(false);router.refresh()}
  }
  async function remove(){
    if(!target||busy)return
    setBusy(true);setError("")
    try{await musicRequest("/api/listening-playlist/"+encodeURIComponent(target.id),"DELETE",{version:target.version});if(music.queue?.list.id===target.id)music.stop();setRemoved(ids=>[...ids,target.id]);setTarget(null);router.refresh()}
    catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}
    finally{setBusy(false)}
  }
  const categoryHref=(value:string,nextPage=1)=>"/public-listening-playlists?"+new URLSearchParams({...(value?{category:value}:{}),...(top?{top:"1"}:{}),page:String(nextPage)})
  const rows=<ul className={styles.rows}>{visible.map(list=><MusicCatalogRow key={list.id} list={list}
    displayName={renamed[list.id]?.from===list.name?renamed[list.id].name:list.name} owned={owned} busy={busy}
    canSort={owned&&visible.length>1} playingDisabled={music.loading} play={()=>void music.start(list.id)}
    rename={()=>void openEdit(list.id,"rename")} remove={()=>void openEdit(list.id,"remove")} />)}</ul>
  return <section className={styles.page}>
    <div className={styles.heading}><h1>{t(owned?"Moja muzika":"Javne muzicke liste")}</h1><Headphones aria-hidden="true" size={24} /></div>
    {!owned && <div className={styles.notice}>
      <p><GuideText text={{ sr: "Pregledaj javne muzičke liste sa YouTube linkovima i pokreni snimke u ugrađenom plejeru. Za pravljenje svojih lista koristi Moju muziku nakon prijave. Lista za slušanje sadrži snimke, dok plejlista za gitaru povezuje zapise pesama sa akordima.", en: "Browse public music lists with YouTube links and start recordings in the embedded player. To create your own lists, sign in and use My music. A listening list contains recordings; a guitar playlist connects song charts with chords." }} /></p>
      <Link href="/vodici/youtube-muzika-i-muzicke-plejliste" prefetch={false}><GuideText text={{ sr: "Kako napraviti i podeliti muzičku listu", en: "How to create and share a music list" }} /></Link>
    </div>}
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
    {notice&&<p role="status" className={styles.notice}>{t(notice)}</p>}
    {owned&&visible.length>1&&<p className={styles.notice+" "+styles.muted}>{t("Prevuci plejlistu za ručicu. Redosled se čuva automatski.")}</p>}
    {!visible.length?<p className={styles.muted}>{t("Nema muzickih lista u ovom pregledu.")}</p>:owned?<DndContext id="music-catalog-order" sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd} accessibility={{screenReaderInstructions:{draggable:t("Za pomeranje pritisni razmak, promeni poziciju strelicama i ponovo pritisni razmak. Escape otkazuje pomeranje.")}}}>
      <SortableContext items={visible.map(list=>list.id)} strategy={verticalListSortingStrategy}>{rows}</SortableContext>
    </DndContext>:rows}
    {!owned&&!top&&<nav className={styles.pagination} aria-label={t("Stranice muzickih lista")}>{page>1?<Link className="ui-button" href={categoryHref(category,page-1)}>{t("Prethodna")}</Link>:<span />}{lists.length===50&&<Link className="ui-button" href={categoryHref(category,page+1)}>{t("Sledeca")}</Link>}</nav>}
    {target&&editMode==="rename"&&<PlaylistNameDialog initialName={target.name} close={()=>setTarget(null)} save={value=>rename(target,value)} />}
    {target&&editMode==="remove"&&<PlaylistDialog title="Obrisi muzicku listu" close={()=>setTarget(null)} busy={busy}><p className={styles.notice}><strong translate="no">{target.name}</strong></p><p className={styles.notice}>{t("Brise se muzicka lista sa svojim linkovima. Pesme sa akordima i druge liste ostaju.")}</p>{error&&<p role="alert" className={styles.error}>{t(error)}</p>}<div className={styles.commands}><button type="button" className="ui-button" disabled={busy} onClick={()=>setTarget(null)}>{t("Otkazi")}</button><button type="button" className="ui-button ui-button-destructive" disabled={busy} onClick={()=>void remove()}><Trash2 aria-hidden="true" />{t(busy?"Brisem...":"Potvrdi brisanje")}</button></div></PlaylistDialog>}
  </section>
}

function MusicCatalogRow({list,displayName,owned,busy,canSort,playingDisabled,play,rename,remove}:{
  list:MusicSummary; displayName:string; owned:boolean; busy:boolean; canSort:boolean; playingDisabled:boolean;
  play:()=>void; rename:()=>void; remove:()=>void
}){
  const {t,locale}=useI18n()
  const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id:list.id,disabled:!canSort||busy})
  return <li ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition}} className={styles.row} data-music-list={list.id} data-dragging={isDragging}>
    {canSort&&<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={busy} className={styles.icon+" "+styles.drag} title={t("Promeni redosled plejlista")} aria-label={t("Promeni redosled plejlista")+": "+displayName}><GripVertical aria-hidden="true" /></button>}
    <button type="button" className={styles.icon} disabled={!list.count||playingDisabled} title={t("Pusti listu")} aria-label={t("Pusti listu")+": "+displayName} onClick={play}><Play aria-hidden="true" /></button>
    <div className={styles.identity}><Link href={"/listening-playlist/"+encodeURIComponent(list.id)} prefetch={false}>{displayName}</Link><small><span>{list.count} {t("stavki")}</span><span>{getCategoryLabel(list.category,locale)}</span><span>{list.isPublic?<Users size={14} aria-hidden="true" />:<Lock size={14} aria-hidden="true" />}{t(list.isPublic?"Javna lista":"Privatna lista")}</span>{!owned&&list.author&&<span>{list.author}</span>}</small></div>
    {owned?<div className={styles.commands+" "+styles.itemCommands}>
      <button type="button" className={styles.icon} disabled={busy} title={t("Preimenuj playlistu")} aria-label={t("Preimenuj playlistu")+": "+displayName} onClick={rename}><Pencil aria-hidden="true" /></button>
      <button type="button" className={styles.icon+" ui-button-danger"} disabled={busy} title={t("Obrisi muzicku listu")} aria-label={t("Obrisi muzicku listu")+": "+displayName} onClick={remove}><Trash2 aria-hidden="true" /></button>
    </div>:<LikePlaylistButton playlistId={list.id} initialLiked={list.liked} initialCount={list.likes} />}
  </li>
}
