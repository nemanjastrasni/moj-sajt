/* Shared metadata cache for app and maintenance; no player or search requests. */
const DAY=86400000,MAX_REQUESTS=200
const key=s=>s.kind+':'+s.id
const valid=s=>s&&(['video','playlist'].includes(s.kind))&&(s.kind==='video'?/^[\w-]{11}$/:/^[\w-]{10,100}$/).test(s.id)
const SCHEMA=`CREATE TABLE IF NOT EXISTS public."YouTubeMetadata" (
 kind text NOT NULL CHECK (kind IN ('video','playlist')), "sourceId" text NOT NULL,
 title text, "channelTitle" text, "fetchedAt" timestamptz,
 "retryAfter" timestamptz NOT NULL DEFAULT to_timestamp(0), "leaseUntil" timestamptz NOT NULL DEFAULT to_timestamp(0),
 PRIMARY KEY(kind,"sourceId")
)`
async function setup(db){
  await db.query(SCHEMA)
  await db.query('ALTER TABLE public."YouTubeMetadata" ENABLE ROW LEVEL SECURITY')
  await db.query('REVOKE ALL ON public."YouTubeMetadata" FROM anon, authenticated')
  await db.query(`CREATE TABLE IF NOT EXISTS public."YouTubeMetadataBudget" (id text PRIMARY KEY,day date NOT NULL,requests integer NOT NULL DEFAULT 0,"blockedUntil" timestamptz NOT NULL DEFAULT to_timestamp(0))`)
  await db.query('ALTER TABLE public."YouTubeMetadataBudget" ENABLE ROW LEVEL SECURITY')
  await db.query('REVOKE ALL ON public."YouTubeMetadataBudget" FROM anon, authenticated')
}
async function reserve(db){
  const result=await db.query(`INSERT INTO public."YouTubeMetadataBudget" (id,day,requests) VALUES ('metadata',CURRENT_DATE,1)
   ON CONFLICT(id) DO UPDATE SET day=CURRENT_DATE,requests=CASE WHEN "YouTubeMetadataBudget".day=CURRENT_DATE THEN "YouTubeMetadataBudget".requests+1 ELSE 1 END
   WHERE "YouTubeMetadataBudget"."blockedUntil"<CURRENT_TIMESTAMP AND ("YouTubeMetadataBudget".day<>CURRENT_DATE OR "YouTubeMetadataBudget".requests<$1) RETURNING requests`,[MAX_REQUESTS])
  return result.rows.length>0
}
async function read(db,sources){
  if(!sources.length)return new Map()
  const result=await db.query(`SELECT * FROM public."YouTubeMetadata" WHERE (kind||':'||"sourceId")=ANY($1::text[])`,[sources.map(key)])
  return new Map(result.rows.map(r=>[r.kind+':'+r.sourceId,r]))
}
function fresh(row,now=Date.now()){return Boolean(row?.title&&row.fetchedAt&&now-new Date(row.fetchedAt).getTime()<28*DAY)}
async function metadata(db,input,{apiKey=process.env.YOUTUBE_API_KEY,request=fetch,now=Date.now,deadlineMs=8000}={}){
  const sources=[...new Map(input.filter(valid).map(s=>[key(s),s])).values()],stats={requests:0,resolved:0},deadline=now()+deadlineMs
  let cached=await read(db,sources)
  if(apiKey)for(const kind of ['video','playlist']){
    const pending=sources.filter(s=>s.kind===kind&&!fresh(cached.get(key(s)),now())&&new Date(cached.get(key(s))?.retryAfter||0).getTime()<=now())
    for(let start=0;start<pending.length&&now()<deadline;start+=50){
      const group=pending.slice(start,start+50)
      const lease=await db.query(`INSERT INTO public."YouTubeMetadata" (kind,"sourceId","leaseUntil") SELECT $1,id,CURRENT_TIMESTAMP+INTERVAL '20 seconds' FROM unnest($2::text[]) AS id
          ON CONFLICT(kind,"sourceId") DO UPDATE SET "leaseUntil"=EXCLUDED."leaseUntil"
          WHERE "YouTubeMetadata"."leaseUntil"<CURRENT_TIMESTAMP AND "YouTubeMetadata"."retryAfter"<=CURRENT_TIMESTAMP
          AND ("YouTubeMetadata"."fetchedAt" IS NULL OR "YouTubeMetadata"."fetchedAt"<CURRENT_TIMESTAMP-INTERVAL '28 days') RETURNING "sourceId"`,[kind,group.map(s=>s.id)])
      const claimed=group.filter(s=>lease.rows.some(r=>r.sourceId===s.id))
      if(!claimed.length)continue
      const ids=claimed.map(s=>s.id)
      try{
        if(!await reserve(db))throw Error('METADATA_BUDGET_REACHED')
        stats.requests++
        const url='https://www.googleapis.com/youtube/v3/'+(kind==='video'?'videos':'playlists')+'?'+new URLSearchParams({part:'snippet',id:ids.join(','),fields:'items(id,snippet(title,channelTitle))',key:apiKey})
        const response=await request(url,{signal:AbortSignal.timeout(Math.max(1,Math.min(5000,deadline-now()))),cache:'no-store',redirect:'error'})
        const data=await response.json()
        if(!response.ok||!Array.isArray(data.items)){
          if(response.status===403||response.status===429)await db.query(`UPDATE public."YouTubeMetadataBudget" SET "blockedUntil"=CURRENT_TIMESTAMP+INTERVAL '1 hour' WHERE id='metadata'`)
          throw Error('METADATA_UNAVAILABLE')
        }
        for(const source of claimed){
          const item=data.items.find(v=>v.id===source.id),title=typeof item?.snippet?.title==='string'?item.snippet.title.trim().slice(0,300):null,channel=typeof item?.snippet?.channelTitle==='string'?item.snippet.channelTitle.trim().slice(0,200):null
          await db.query(`UPDATE public."YouTubeMetadata" SET title=$1,"channelTitle"=$2,"fetchedAt"=CURRENT_TIMESTAMP,"retryAfter"=CURRENT_TIMESTAMP+INTERVAL '6 hours',"leaseUntil"=to_timestamp(0) WHERE kind=$3 AND "sourceId"=$4`,[title||null,channel,kind,source.id])
        }
      }catch{
        await db.query(`UPDATE public."YouTubeMetadata" SET "retryAfter"=CURRENT_TIMESTAMP+INTERVAL '15 minutes',"leaseUntil"=to_timestamp(0),title=CASE WHEN "fetchedAt"<CURRENT_TIMESTAMP-INTERVAL '29 days' THEN NULL ELSE title END,"channelTitle"=CASE WHEN "fetchedAt"<CURRENT_TIMESTAMP-INTERVAL '29 days' THEN NULL ELSE "channelTitle" END WHERE kind=$1 AND "sourceId"=ANY($2::text[])`,[kind,ids])
      }
    }
  }
  cached=await read(db,sources)
  const values=new Map([...cached].filter(([,row])=>fresh(row,now())).map(([k,row])=>[k,{title:row.title,channelTitle:row.channelTitle||''}]))
  stats.resolved=values.size
  return {values,stats}
}
module.exports={metadata,setup,valid,fresh,key,MAX_REQUESTS}
