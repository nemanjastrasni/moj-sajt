"use client"

import Link from "next/link"
import { useEffect,useRef,useState,type ReactNode } from "react"
import { Headphones,Pause,Play,RefreshCw,Shuffle,SkipBack,SkipForward,X } from "lucide-react"
import type { YouTubePlayer } from "@/lib/music/youtubePlayer"
import { canonicalYoutube } from "@/lib/music/model"
import { useMusic } from "./MusicContext"
import MusicChooser from "./MusicChooser"
import { useI18n } from "./UiText"
import styles from "./Music.module.css"

export default function MusicWorkspace({children}:{children:ReactNode}){
  const music=useMusic(),open=Boolean(music.queue||music.loading||music.error),{t}=useI18n()
  return <div className={styles.workspace+(open?" "+styles.open:"")} data-music-workspace data-music-open={open}>
    {open&&<aside className={styles.dock} aria-label={t("YouTube plejer")}>
      <div className={styles.dockHeading}><Headphones aria-hidden="true" /><span>{music.queue?.list.name||t("Moja muzika")}</span><button type="button" className={styles.icon} onClick={music.stop} title={t("Zaustavi i zatvori muziku")} aria-label={t("Zaustavi i zatvori muziku")}><X /></button></div>
      {music.loading&&<p role="status">{t("Ucitavam muziku...")}</p>}
      {music.error&&<p role="alert" className={styles.error}>{t(music.error)}</p>}
      {music.queue&&<YouTubeDock />}
      {!music.queue&&<button type="button" className="ui-button" onClick={music.openChooser}>{t("Izaberi muziku")}</button>}
    </aside>}
    <div className={styles.content}>{children}</div>
    {music.chooser&&<MusicChooser />}
  </div>
}
function YouTubeDock(){
  const music=useMusic(),queue=music.queue!,{t}=useI18n(),mount=useRef<HTMLDivElement>(null),player=useRef<YouTubePlayer|null>(null)
  const current=queue.list.items.find(item=>item.id===queue.currentId)!,index=queue.list.items.indexOf(current)
  const [ready,setReady]=useState(0),[retry,setRetry]=useState(0),[phase,setPhase]=useState("loading"),[notice,setNotice]=useState(""),[title,setTitle]=useState("")
  const state=useRef({music,current,index})
  useEffect(()=>{state.current={music,current,index}},[music,current,index])
  useEffect(()=>{
    const element=mount.current;if(!element)return
    let disposed=false
    const deadline=window.setTimeout(()=>{if(!disposed){setPhase("error");setNotice("YouTube plejer nije dostupan. Pokusaj ponovo.")}},20000)
    const target=document.createElement("div");element.appendChild(target)
    import("@/lib/music/youtubePlayer").then(module=>module.loadYouTubeAPI()).then(api=>{
      if(disposed)return
      const created=new api.Player(target,{width:"100%",height:"200",host:"https://www.youtube-nocookie.com",playerVars:{origin:location.origin,playsinline:1,controls:1,autoplay:0},events:{
        onReady:event=>{
          if(disposed)return
          window.clearTimeout(deadline)
          player.current=event.target
          const iframe=element.querySelector("iframe")
          iframe?.setAttribute("title","YouTube");iframe?.setAttribute("allow","autoplay; encrypted-media; picture-in-picture; fullscreen");iframe?.setAttribute("referrerpolicy","strict-origin-when-cross-origin")
          setReady(value=>value+1)
        },
        onStateChange:event=>{
          if(disposed)return
          if(event.data===1){setPhase("playing");setNotice("");setTitle(event.target.getVideoData?.().title?.slice(0,200)||"")}
          if(event.data===2||event.data===5)setPhase("paused")
          if(event.data===3)setPhase("loading")
          if(event.data===0){
            setPhase("ended")
            const {current,music,index}=state.current
            if(current.source?.kind==="video"&&event.target.getVideoData?.().video_id===current.source.id&&(music.shuffle||index<music.queue!.list.items.length-1))music.next()
          }
        },
        onError:()=>{if(!disposed){setPhase("error");setNotice("Snimak nije dostupan u plejeru. Izaberi drugi ili ga otvori na YouTube-u.")}},
        onAutoplayBlocked:()=>{if(!disposed){setPhase("paused");setNotice("Pregledac je blokirao reprodukciju. Pokreni video u YouTube plejeru.")}},
      }})
      // Keep the handle even before onReady, so a late SDK callback cannot leak an iframe.
      player.current=created
    }).catch(()=>{if(!disposed){setPhase("error");setNotice("YouTube plejer nije dostupan. Pokusaj ponovo.")}})
    return()=>{disposed=true;window.clearTimeout(deadline);player.current?.destroy?.();player.current=null;element.replaceChildren()}
  },[retry])
  const source=current.source!,selection=queue.list.id+current.id+source.kind+source.id+queue.nonce
  useEffect(()=>{
    const instance=player.current;if(!ready||!instance)return
    setTitle("");setNotice("");setPhase("loading")
    const hidden=document.hidden||Boolean(document.querySelector("dialog[open]"))
    if(source.kind==="video"){
      if(hidden)instance.cueVideoById(source.id);else instance.loadVideoById(source.id)
    }else{
      if(hidden)instance.cuePlaylist({list:source.id,listType:"playlist"});else instance.loadPlaylist({list:source.id,listType:"playlist"})
    }
  },[selection,ready,source.id,source.kind])
  useEffect(()=>{
    const pause=()=>{if(document.hidden||document.querySelector("dialog[open]")){player.current?.pauseVideo?.();setPhase(value=>value==="playing"?"paused":value)}}
    document.addEventListener("visibilitychange",pause)
    const observer=new MutationObserver(pause);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["open"],childList:true})
    const visibility=new IntersectionObserver(entries=>{if(entries[0]&&!entries[0].isIntersecting)player.current?.pauseVideo?.()})
    if(mount.current)visibility.observe(mount.current)
    return()=>{document.removeEventListener("visibilitychange",pause);observer.disconnect();visibility.disconnect()}
  },[])
  return <>
    <div ref={mount} className={styles.video} data-music-video />
    <p className={styles.nowPlaying} title={title||current.title} translate="no">{title||current.title}</p>
    <div className={styles.transport}>
      <button type="button" className={styles.icon} disabled={index===0} title={t("Prethodna stavka")} aria-label={t("Prethodna stavka")} onClick={music.previous}><SkipBack /></button>
      <button type="button" className={styles.icon} disabled={!ready} title={t(phase==="playing"?"Pauziraj muziku":"Pokreni muziku")} aria-label={t(phase==="playing"?"Pauziraj muziku":"Pokreni muziku")} onClick={()=>phase==="playing"?player.current?.pauseVideo():player.current?.playVideo()}>{phase==="playing"?<Pause />:<Play />}</button>
      <button type="button" className={styles.icon} disabled={queue.list.items.length<2||!music.shuffle&&index===queue.list.items.length-1} title={t("Sledeca stavka")} aria-label={t("Sledeca stavka")} onClick={music.next}><SkipForward /></button>
      <button type="button" className={styles.icon} aria-pressed={music.shuffle} title={t("Nasumicni redosled")} aria-label={t("Nasumicni redosled")} onClick={music.toggleShuffle}><Shuffle /></button>
      <span className={styles.muted}>{index+1}/{queue.list.items.length}</span>
    </div>
    {notice&&<p role="status" className={styles.notice}>{t(notice)}</p>}
    {phase==="error"&&<button type="button" className="ui-button" onClick={()=>{setReady(0);setRetry(value=>value+1)}}><RefreshCw aria-hidden="true" />{t("Pokusaj ponovo")}</button>}
    <div className={styles.dockLinks}><a href={canonicalYoutube(source)} target="_blank" rel="noopener">YouTube</a><Link href={"/listening-playlist/"+encodeURIComponent(queue.list.id)}>{t("Otvori listu")}</Link><button type="button" onClick={music.openChooser}>{t("Promeni listu")}</button></div>
  </>
}
