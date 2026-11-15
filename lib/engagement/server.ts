import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { unstable_cache, revalidateTag } from "next/cache"
import { activityKinds, type ActivityInput, type EngagementReport } from "./model"

export const ENGAGEMENT_TAG = "engagement-summary-v1"
type DB = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">
export async function preference(userId: string) {
  const rows = await prisma.$queryRaw<{ enabled: boolean }[]>`SELECT COALESCE(p.enabled,false) AS enabled
    FROM public."EngagementConfig" c CROSS JOIN public."User" u
    LEFT JOIN public."EngagementConsent" p ON p."userId"=u.id
    WHERE c.id AND u.id=${userId} AND NOT u.banned AND u.role<>'admin'`
  return rows.length ? { eligible: true, enabled: rows[0].enabled } : { eligible: false, enabled: false }
}
export async function savePreference(userId: string, enabled: boolean) {
  await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ userId: string }[]>`INSERT INTO public."EngagementConsent" ("userId",enabled)
      SELECT u.id,${enabled} FROM public."User" u CROSS JOIN public."EngagementConfig" c WHERE c.id AND u.id=${userId} AND NOT u.banned AND u.role<>'admin'
      ON CONFLICT ("userId") DO UPDATE SET enabled=EXCLUDED.enabled,"updatedAt"=CURRENT_TIMESTAMP,
        "firstDay"=CASE WHEN NOT EXCLUDED.enabled THEN NULL ELSE "EngagementConsent"."firstDay" END RETURNING "userId"`
    if (!rows.length) throw Error("Ineligible account")
    if (!enabled) await tx.$executeRaw`DELETE FROM public."EngagementDaily" WHERE "userId"=${userId}`
  }, { timeout: 5000 })
  revalidateTag(ENGAGEMENT_TAG)
}
export function recordQuery(userId: string, input: ActivityInput) {
  // Only the validated enum controls SQL identifiers. No song/list names, URLs or IDs are stored.
  if (!activityKinds.includes(input.kind) || input.kind === "active") throw Error("Invalid event kind")
  const column = Prisma.raw(input.kind)
  return Prisma.sql`WITH eligible AS MATERIALIZED (
      SELECT p."userId" FROM public."EngagementConsent" p JOIN public."User" u ON u.id=p."userId"
      WHERE p."userId"=${userId} AND p.enabled AND NOT u.banned AND u.role<>'admin'
      FOR UPDATE OF p FOR SHARE OF u
    ), first_activity AS (
      UPDATE public."EngagementConsent" SET "firstDay"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
      WHERE "firstDay" IS NULL AND "userId" IN (SELECT "userId" FROM eligible)
    )
    INSERT INTO public."EngagementDaily" ("userId",day,active,${column})
    SELECT "userId",(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,true,true FROM eligible
    ON CONFLICT ("userId",day) DO UPDATE SET ${column}=true WHERE NOT "EngagementDaily".${column}`
}
// Separate active insert avoids repeating the same column in INSERT.
export async function recordActivity(db: DB, userId: string, input: ActivityInput) {
  const query = input.kind === "active" ? Prisma.sql`WITH eligible AS MATERIALIZED (
    SELECT p."userId" FROM public."EngagementConsent" p JOIN public."User" u ON u.id=p."userId"
    WHERE p."userId"=${userId} AND p.enabled AND NOT u.banned AND u.role<>'admin' FOR UPDATE OF p FOR SHARE OF u
  ), first_activity AS (
    UPDATE public."EngagementConsent" SET "firstDay"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
    WHERE "firstDay" IS NULL AND "userId" IN (SELECT "userId" FROM eligible)
  ) INSERT INTO public."EngagementDaily" ("userId",day) SELECT "userId",(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date FROM eligible
  ON CONFLICT ("userId",day) DO NOTHING` : recordQuery(userId,input)
  await db.$executeRaw(query)
}
export async function canRecord(userId: string, input: ActivityInput) {
  const consent = await preference(userId)
  if (!consent.enabled) return false
  if (input.kind === "active") return true
  if (input.kind === "music_play") return Boolean(await prisma.listeningPlaylist.findFirst({where:{id:input.playlistId,OR:[{isPublic:true},{userId}]},select:{id:true}}))
  return Boolean(await prisma.playlistSong.findFirst({where:{playlistId:input.playlistId,songId:input.songId,playlist:{OR:[{isPublic:true},{userId}]}},select:{id:true}}))
}
let purgeAfter = 0
export async function purgeActivity() {
  if (Date.now() < purgeAfter) return
  await prisma.$executeRaw`DELETE FROM public."EngagementDaily" WHERE day < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 89`
  purgeAfter = Date.now() + 60 * 60 * 1000
}
export function reportQuery() {
  return Prisma.sql`WITH clock AS (SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date AS today),
    daily AS MATERIALIZED (SELECT d.* FROM public."EngagementDaily" d JOIN public."User" u ON u.id=d."userId"
      JOIN public."EngagementConsent" p ON p."userId"=d."userId" CROSS JOIN clock
      WHERE p.enabled AND NOT u.banned AND u.role<>'admin' AND d.day>=today-89 AND d.day<=today),
    periods AS (SELECT n, jsonb_build_object('active',count(*),'repeat',count(*) FILTER (WHERE days>=2),
      'playlist',count(*) FILTER (WHERE song OR perf),'performance',count(*) FILTER (WHERE perf),'music',count(*) FILTER (WHERE music)) AS counts
      FROM (SELECT n,d."userId",count(*) AS days,bool_or(playlist_song) AS song,bool_or(performance) AS perf,bool_or(music_play) AS music
        FROM daily d CROSS JOIN clock CROSS JOIN (VALUES (7),(30)) v(n) WHERE d.day>=today-(n-1) GROUP BY n,d."userId") g GROUP BY n),
    cohort AS (SELECT p."userId",p."firstDay" FROM public."EngagementConsent" p JOIN public."User" u ON u.id=p."userId" CROSS JOIN clock
      WHERE p.enabled AND NOT u.banned AND u.role<>'admin' AND p."firstDay" BETWEEN today-41 AND today-14),
    days AS (SELECT today-13+series.n AS day, count(d."userId")::int AS active, count(d."userId") FILTER (WHERE playlist_song OR performance)::int AS playlist,
      count(d."userId") FILTER (WHERE music_play)::int AS music FROM clock CROSS JOIN generate_series(0,13) AS series(n)
      LEFT JOIN daily d ON d.day=today-13+series.n GROUP BY today,series.n)
    SELECT jsonb_build_object('startedAt',c."startedAt",'calculatedAt',CURRENT_TIMESTAMP,
      'eligible',(SELECT count(*) FROM public."User" WHERE NOT banned AND role<>'admin'),
      'optedIn',(SELECT count(*) FROM public."EngagementConsent" p JOIN public."User" u ON u.id=p."userId" WHERE p.enabled AND NOT u.banned AND u.role<>'admin'),
      'seven',COALESCE((SELECT counts FROM periods WHERE n=7),'{"active":0,"repeat":0,"playlist":0,"performance":0,"music":0}'::jsonb),
      'thirty',COALESCE((SELECT counts FROM periods WHERE n=30),'{"active":0,"repeat":0,"playlist":0,"performance":0,"music":0}'::jsonb),
      'cohort',jsonb_build_object('eligible',(SELECT count(*) FROM cohort),'returned',(SELECT count(*) FROM cohort c WHERE EXISTS
        (SELECT 1 FROM daily d WHERE d."userId"=c."userId" AND d.day BETWEEN c."firstDay"+7 AND c."firstDay"+13))),
      'inventory',jsonb_build_object('registrations',(SELECT count(*) FROM public."User" CROSS JOIN clock WHERE NOT banned AND role<>'admin' AND "createdAt">=((today-29)::timestamp AT TIME ZONE 'UTC')),
        'playlists',(SELECT count(*) FROM public."Playlist" p JOIN public."User" u ON u.id=p."userId" CROSS JOIN clock WHERE NOT u.banned AND u.role<>'admin' AND p."createdAt">=((today-29)::timestamp AT TIME ZONE 'UTC')),
        'musicLists',(SELECT count(*) FROM public."ListeningPlaylist" p JOIN public."User" u ON u.id=p."userId" CROSS JOIN clock WHERE NOT u.banned AND u.role<>'admin' AND p."createdAt">=((today-29)::timestamp AT TIME ZONE 'UTC'))),
      'days',(SELECT jsonb_agg(jsonb_build_object('day',day,'active',active,'playlist',playlist,'music',music) ORDER BY day) FROM days)) AS report
    FROM public."EngagementConfig" c WHERE c.id`
}
const cachedReport = unstable_cache(async () => {
  await purgeActivity()
  const rows = await prisma.$queryRaw<{ report: EngagementReport }[]>(reportQuery())
  if (!rows[0]?.report) throw Error("Engagement setup missing")
  return rows[0].report
}, ["engagement-summary-v1"], { revalidate: 60, tags: [ENGAGEMENT_TAG] })
export async function readEngagement() {
  await requireSongAdmin()
  try { return { available: true as const, report: await cachedReport() } }
  catch { return { available: false as const } }
}
