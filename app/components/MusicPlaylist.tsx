"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useRef,useState } from "react"
import { DndContext,closestCenter,KeyboardSensor,PointerSensor,useSensor,useSensors,type DragEndEvent } from "@dnd-kit/core"
import { SortableContext,arrayMove,sortableKeyboardCoordinates,useSortable,verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDown,ArrowUp,ExternalLink,GripVertical,Headphones,Lock,Pencil,Play,Plus,RefreshCw,Save,Share2,Trash2,Users } from "lucide-react"
import { externalMusicUrl,musicCategories,type MusicItem,type MusicList } from "@/lib/music/model"
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
  const [positionId,setPositionId]=useState<string|null>(null),[position,setPosition]=useState("")
  const running=useRef(false)
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}))
  const editable=list.editable&&status==="authenticated"&&session?.user?.id===viewerId
  if(!list.isPublic&&status!=="loading"&&session?.user?.id!==viewerId)return <p className={styles.error}>{t("Muzicka lista nije dostupna.")}</p>
  function accept(value:unknown){const next=checkedMusic(value);if(next.id!==list.id)throw Error("Neispravni podaci muzicke liste.");setList(next);music.reconcile(next);return next}
  async function update(endpoint:string,method:string,body:Record<string,unknown>,ordered?:MusicItem[]){
    if(running.current||!editable)return false
    running.current=true
    const before=list
    setBusy(true);setError("");setNotice("")
    if(ordered)setList({...before,items:ordered})
    try{const result=await musicRequest(endpoint,method,{...body,version:list.version});accept(result.playlist);router.refresh();return true}
    catch(cause){if(ordered)setList(before);setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.");return false}
    finally{running.current=false;setBusy(false)}
  }
  async function moveItem(id:string,to:number){
    if(!editable||running.current)return false
    const from=list.items.findIndex(item=>item.id===id)
    if(from<0||!Number.isInteger(to)||to<0||to>=list.items.length){setError("Unesi vazecu poziciju.");return false}
    if(from===to)return true
    const ordered=arrayMove(list.items,from,to).map((item,order)=>({...item,order}))
    const saved=await update("/api/listening-playlist/reorder","PUT",{playlistId:list.id,items:ordered.map(item=>item.id)},ordered)
    if(saved)setNotice("Redosled je sacuvan.")
    return saved
  }
  function dragEnd({active,over}:DragEndEvent){
    if(over&&active.id!==over.id)void moveItem(String(active.id),list.items.findIndex(item=>item.id===over.id))
  }
  const base="/api/listening-playlist/"+encodeURIComponent(list.id)
  return <section className={styles.page} aria-busy={busy}>
    <div className={styles.heading}><h1 translate="no">{list.name}</h1><Headphones aria-hidden="true" size={24} /></div>
    <p className={styles.notice+" "+styles.muted}>{getCategoryLabel(list.category,locale)} · {t(list.isPublic?"Javna lista":"Privatna lista")} · {list.items.length} {t("stavki")}</p>
    <div className={styles.tabs}>
      <button type="button" className="ui-button ui-button-primary" disabled={!list.items.some(item=>item.source)||music.loading} onClick={()=>void music.start(list.id)}><Play aria-hidden="true" />{t("Pusti listu")}</button>
      {editable&&<button type="button" className="ui-button" disabled={busy} onClick={()=>{setName(list.name);setCategory(list.category||"Mix");setPublic(list.isPublic);setError("");setEdit(true)}}><Pencil aria-hidden="true" />{t("Izmeni listu")}</button>}
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
    {error&&!edit&&!removeId&&!positionId&&<div role="alert" className={styles.error}><p>{t(error)}</p><button type="button" disabled={busy} className="ui-button mt-3" onClick={async()=>{
      if(running.current)return
      running.current=true;setBusy(true)
      try{const result=await musicRequest(base);accept(result.playlist);setError("")}
      catch(cause){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}
      finally{running.current=false;setBusy(false)}
    }}><RefreshCw aria-hidden="true" />{t("Osvezi listu")}</button></div>}
    {editable&&list.items.length>1&&<p className={styles.notice+" "+styles.muted}>{t("Prevuci stavku za rucicu ili klikni na njen broj da izaberes poziciju. Redosled se cuva automatski.")}</p>}
    {busy&&<p role="status" className={styles.notice}>{t("Cuvam...")}</p>}
    {!list.items.length?<p className={styles.muted}>{t("Ova muzicka lista je prazna.")}</p>:<DndContext id={"music-order-"+list.id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd} accessibility={{
      screenReaderInstructions:{draggable:t("Za pomeranje pritisni razmak, promeni poziciju strelicama i ponovo pritisni razmak. Escape otkazuje pomeranje.")},
      announcements:{
        onDragStart:()=>t("Pomeranje stavke je zapoceto."),
        onDragOver:({over})=>over?t("Izabrana pozicija: {position}.",{position:list.items.findIndex(item=>item.id===over.id)+1}):undefined,
        onDragEnd:({over})=>over?t("Izabrana pozicija: {position}.",{position:list.items.findIndex(item=>item.id===over.id)+1}):t("Pomeranje je otkazano."),
        onDragCancel:()=>t("Pomeranje je otkazano."),
      },
    }}><SortableContext items={list.items.map(item=>item.id)} strategy={verticalListSortingStrategy}>
      <ol className={styles.rows}>{list.items.map((item,index)=><MusicPlaylistItem key={item.id} item={item} index={index} total={list.items.length} editable={editable} busy={busy}
        playing={music.queue?.list.id===list.id&&music.queue.currentId===item.id} play={()=>void music.start(list.id,item.id)}
        move={to=>void moveItem(item.id,to)} choosePosition={()=>{setError("");setPositionId(item.id);setPosition(String(index+1))}}
        remove={()=>{setError("");setRemoveId(item.id)}} />)}</ol>
    </SortableContext></DndContext>}
    {positionId&&<PlaylistDialog title="Pomeri na poziciju" close={()=>setPositionId(null)} busy={busy}>
      <p className={styles.notice} translate="no">{list.items.find(item=>item.id===positionId)?.title}</p>
      <form className={styles.dialogForm} onSubmit={async event=>{event.preventDefault();if(await moveItem(positionId,Number(position)-1))setPositionId(null)}}>
        <label>{t("Pozicija od 1 do {count}",{count:list.items.length})}<input className="ui-input" type="number" inputMode="numeric" min={1} max={list.items.length} step={1} required disabled={busy} value={position} onChange={event=>setPosition(event.target.value)} /></label>
        {error&&<p role="alert" className={styles.error}>{t(error)}</p>}
        <div className={styles.commands}><button type="button" className="ui-button" disabled={busy} onClick={()=>setPositionId(null)}>{t("Otkazi")}</button><button type="submit" className="ui-button ui-button-primary" disabled={busy}><Save aria-hidden="true" />{t(busy?"Cuvam...":"Pomeri")}</button></div>
      </form>
    </PlaylistDialog>}
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

function MusicPlaylistItem({item,index,total,editable,busy,playing,play,move,choosePosition,remove}:{
  item:MusicItem;index:number;total:number;editable:boolean;busy:boolean;playing:boolean;play:()=>void;move:(to:number)=>void;choosePosition:()=>void;remove:()=>void
}){
  const {t}=useI18n()
  const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id:item.id,disabled:!editable||busy||total<2})
  const external=externalMusicUrl(item.url)
  return <li ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition}} className={styles.row} data-music-item={item.id} data-playing={playing} data-dragging={isDragging}>
    {editable&&<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={busy||total<2} className={styles.icon+" "+styles.drag} title={t("Promeni redosled pesme")} aria-label={t("Promeni redosled pesme")+": "+item.title}><GripVertical aria-hidden="true" /></button>}
    {item.source?<button type="button" className={styles.icon} title={t("Pokreni muziku")+": "+item.title} aria-label={t("Pokreni muziku")+": "+item.title} onClick={play}><Play /></button>:!editable&&<span className={styles.muted}>{index+1}.</span>}
    <div className={styles.identity}><strong translate="no">{item.title||item.type}</strong>
      {item.youtubeTitle&&item.youtubeTitle!==item.title&&<span className={styles.sourceTitle} translate="no">{item.youtubeTitle}</span>}
      <small>{item.channelTitle&&<span translate="no">{t("Kanal")}: {item.channelTitle}</span>}{item.source?<span>YouTube{item.source.kind==="playlist"?" playlist":""}</span>:external?<a href={external} target="_blank" rel="noopener"><ExternalLink size={14} aria-hidden="true" />{t("Otvori izvor")}</a>:<span>{t("Ovaj stari link nije podrzan u plejeru.")}</span>}</small></div>
    {editable&&<div className={styles.commands+" "+styles.itemCommands}>
      <button type="button" className={styles.icon+" "+styles.position} disabled={busy||total<2} title={t("Pomeri na poziciju")} aria-label={t("Pomeri na poziciju")+": "+item.title} onClick={choosePosition}>{index+1}.</button>
      <button type="button" className={styles.icon} disabled={busy||index===0} title={t("Pomeri stavku gore")} aria-label={t("Pomeri stavku gore")+": "+item.title} onClick={()=>move(index-1)}><ArrowUp /></button>
      <button type="button" className={styles.icon} disabled={busy||index===total-1} title={t("Pomeri stavku dole")} aria-label={t("Pomeri stavku dole")+": "+item.title} onClick={()=>move(index+1)}><ArrowDown /></button>
      <button type="button" className={styles.icon+" ui-button-danger"} disabled={busy} title={t("Ukloni stavku")} aria-label={t("Ukloni stavku")+": "+item.title} onClick={remove}><Trash2 /></button>
    </div>}
  </li>
}
