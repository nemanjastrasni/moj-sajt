import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { contentAdmin } from "@/lib/adminContent/server"
import { isReviewStatus, type ReviewStatus } from "@/lib/songReview/model"
import SongReviewBadge from "./SongReviewBadge"
import styles from "./ArtistSongList.module.css"

type Song = { id: string; slug: string; title: string; lyrics: string; difficulty: string }
type Props = { category: string; artist: string; songs: Song[] }

export default async function ArtistSongList({ category, artist, songs }: Props) {
  const admin = songs.length ? await contentAdmin() : null
  const statuses = new Map<string, ReviewStatus>()
  if (admin) {
    const reviews = await prisma.songReview.findMany({
      where: { songId: { in: songs.map(song => song.id) } },
      select: { songId: true, status: true },
    })
    for (const review of reviews) if (isReviewStatus(review.status)) statuses.set(review.songId, review.status)
  }
  return <ArtistSongRows category={category} artist={artist} songs={songs} statuses={admin ? statuses : undefined} />
}

export function ArtistSongRows({ category, artist, songs, statuses }: Props & { statuses?: Map<string, ReviewStatus> }) {
  return <ul className={styles.list}>
    {songs.map(song => <li key={song.id} className={styles.row}>
      <Link href={`/pesme/${category}/${artist}/${song.slug}`} className={styles.link}>
        {/\b[A-G](#|b)?(m|maj|min|sus|dim|aug)?\d*\b/.test(song.lyrics) ? "\uD83C\uDFB8 " : "\uD83C\uDFB5 "}
        {song.title}
        <span className={styles.difficulty}>{" \u2022 "}{song.difficulty}</span>
      </Link>
      {statuses && <span className={styles.status}><SongReviewBadge status={statuses.get(song.id) ?? "unreviewed"} /></span>}
    </li>)}
  </ul>
}
