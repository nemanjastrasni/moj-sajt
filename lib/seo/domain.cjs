/* Shared build/runtime domain policy. */
const PRIMARY_SITE_URL='https://www.gitarakordi.com'
function preferredOrigin(origin){return origin==='https://gitarakordi.com'?PRIMARY_SITE_URL:origin}
/** @returns {{source:string;has:{type:'host',value:string}[];destination:string;permanent:true}[]} */
function domainRedirects(env){
 if(env.VERCEL_ENV==='preview'||env.NODE_ENV!=='production')return[]
 let configured;try{const input=env.SITE_URL||'',url=new URL(input.includes('://')?input:'https://'+input);if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)return[];configured=url.origin}catch{return[]}
 if(preferredOrigin(configured)!==PRIMARY_SITE_URL)return[]
 return['gitarakordi.com','moj-sajt-rho.vercel.app'].map(host=>({source:'/:path*',has:[{type:'host',value:host}],destination:PRIMARY_SITE_URL+'/:path*',permanent:true}))
}
module.exports={PRIMARY_SITE_URL,preferredOrigin,domainRedirects}
