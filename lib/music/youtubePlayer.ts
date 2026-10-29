export type YouTubePlayer = {
  loadVideoById:(id:string)=>void;cueVideoById:(id:string)=>void;
  loadPlaylist:(options:{list:string;listType:"playlist"})=>void;
  cuePlaylist:(options:{list:string;listType:"playlist"})=>void;
  playVideo:()=>void;pauseVideo:()=>void;destroy:()=>void;
  getVideoData?:()=>{title?:string;video_id?:string};getPlaylist?:()=>string[];getPlaylistIndex?:()=>number;
}
type PlayerEvent={target:YouTubePlayer;data?:number}
type YouTubeAPI={Player:new(element:HTMLElement,options:{width:string;height:string;host:string;playerVars:Record<string,string|number>;events:{onReady:(event:PlayerEvent)=>void;onStateChange:(event:PlayerEvent)=>void;onError:(event:PlayerEvent)=>void;onAutoplayBlocked:()=>void}})=>YouTubePlayer}
declare global {interface Window {YT?:YouTubeAPI;onYouTubeIframeAPIReady?:()=>void}}
let pending:Promise<YouTubeAPI>|null=null
export function loadYouTubeAPI():Promise<YouTubeAPI> {
  if(window.YT?.Player)return Promise.resolve(window.YT)
  if(pending)return pending
  pending=new Promise<YouTubeAPI>((resolve,reject)=>{
    const previous=window.onYouTubeIframeAPIReady
    const script=document.createElement("script")
    let settled=false
    const finish=(error?:Error)=>{
      if(settled)return
      settled=true
      clearTimeout(timer)
      script.removeEventListener("error",failed)
      if(window.onYouTubeIframeAPIReady===ready)window.onYouTubeIframeAPIReady=previous
      if(error){script.remove();pending=null;reject(error)}else if(window.YT?.Player)resolve(window.YT)
    }
    const failed=()=>finish(Error("YouTube plejer nije dostupan. Pokusaj ponovo."))
    const timer=window.setTimeout(failed,15000)
    const ready=()=>{try{previous?.()}finally{if(window.YT?.Player)finish();else failed()}}
    window.onYouTubeIframeAPIReady=ready
    script.src="https://www.youtube.com/iframe_api";script.async=true;script.dataset.musicApi="true"
    script.addEventListener("error",failed,{once:true});document.head.appendChild(script)
  })
  return pending
}
