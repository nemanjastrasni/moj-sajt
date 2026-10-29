"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { checkedMusic, musicRequest } from "@/lib/music/client"
import { nextMusicIndex, type MusicList } from "@/lib/music/model"

type Queue={list:MusicList;currentId:string;identity:string;nonce:number}
type ContextValue={queue:Queue|null;loading:boolean;error:string;chooser:boolean;shuffle:boolean;openChooser:()=>void;closeChooser:()=>void;start:(id:string,itemId?:string)=>Promise<void>;stop:()=>void;next:()=>void;previous:()=>void;toggleShuffle:()=>void;reconcile:(list:MusicList)=>void}
const Context=createContext<ContextValue|null>(null)
const playable=(list:MusicList)=>({...list,items:list.items.filter(item=>item.source)})
export function MusicProvider({children}:{children:ReactNode}) {
  const {data:session,status}=useSession(),pathname=usePathname()
  const identity=status==="loading"?"loading":session?.user?.id?"user:"+session.user.id:"guest"
  const [stored,setStored]=useState<Queue|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("")
  const [chooser,setChooser]=useState(false),[shuffle,setShuffle]=useState(false)
  const request=useRef<AbortController|null>(null),identityRef=useRef(identity)
  const queue=stored?.identity===identity?stored:null
  useEffect(()=>{identityRef.current=identity;request.current?.abort();setStored(null);setLoading(false);setError("");setChooser(false)},[identity])
  useEffect(()=>()=>request.current?.abort(),[])
  const stop=useCallback(()=>{request.current?.abort();request.current=null;setStored(null);setLoading(false);setError("")},[])
  const start=useCallback(async(id:string,itemId?:string)=>{
    request.current?.abort()
    const controller=new AbortController(),startedIdentity=identityRef.current
    request.current=controller;setLoading(true);setError("");setChooser(false)
    try{
      const data=await musicRequest("/api/listening-playlist/"+encodeURIComponent(id),"GET",undefined,controller.signal)
      const list=playable(checkedMusic(data.playlist))
      if(!list.items.length)throw Error("Ova lista nema podrzane YouTube stavke.")
      const selected=list.items.find(item=>item.id===itemId)||list.items[0]
      if(!controller.signal.aborted&&identityRef.current===startedIdentity)setStored(previous=>({list,currentId:selected.id,identity:startedIdentity,nonce:(previous?.nonce||0)+1}))
    }catch(cause){if(!controller.signal.aborted){setError(cause instanceof Error?cause.message:"Muzika trenutno nije dostupna. Pokusaj ponovo.")}}
    finally{if(request.current===controller){request.current=null;setLoading(false)}}
  },[])
  const reconcile=useCallback((value:MusicList)=>{
    const list=playable(value)
    setStored(current=>current?.list.id!==list.id?current:list.items.some(item=>item.id===current.currentId)?{...current,list}:null)
  },[])
  const queueId=queue?.list.id
  useEffect(()=>{
    if(!queueId)return
    const controller=new AbortController()
    const check=async()=>{
      try{const result=await musicRequest("/api/listening-playlist/"+encodeURIComponent(queueId),"GET",undefined,controller.signal);if(!controller.signal.aborted)reconcile(checkedMusic(result.playlist))}
      catch(cause){if(!controller.signal.aborted&&cause&&typeof cause==="object"&&"status"in cause&&[401,403,404].includes(Number(cause.status)))setStored(current=>current?.list.id===queueId?null:current)}
    }
    void check()
    const timer=window.setInterval(()=>{if(!document.hidden)void check()},60000)
    return()=>{controller.abort();window.clearInterval(timer)}
  },[queueId,pathname,identity,reconcile])
  const next=useCallback(()=>setStored(current=>{
    if(!current)return null
    const index=current.list.items.findIndex(item=>item.id===current.currentId),next=nextMusicIndex(index,current.list.items.length,shuffle)
    return next===null?current:{...current,currentId:current.list.items[next].id,nonce:current.nonce+1}
  }),[shuffle])
  const previous=useCallback(()=>setStored(current=>{
    if(!current)return null
    const index=current.list.items.findIndex(item=>item.id===current.currentId)
    return index>0?{...current,currentId:current.list.items[index-1].id,nonce:current.nonce+1}:current
  }),[])
  return <Context.Provider value={{queue,loading,error,chooser,shuffle,openChooser:()=>setChooser(true),closeChooser:()=>setChooser(false),start,stop,next,previous,toggleShuffle:()=>setShuffle(value=>!value),reconcile}}>{children}</Context.Provider>
}
export function useMusic(){const value=useContext(Context);if(!value)throw Error("Missing music provider");return value}
