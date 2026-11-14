import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { contentAdmin } from "@/lib/adminContent/server"
import { isReviewStatus, type ReviewStatus } from "@/lib/songReview/model"
import SongReviewBadge from "./SongReviewBadge"
import styles from "./ArtistSongList.module.css"
import type { Difficulty } from "@/lib/music/difficultyModel"
import SongDifficulty from "./SongDifficulty"
import UiText from "./UiText"
import { difficultyExplanation } from "@/lib/music/difficultyModel"
import SongPerformers from "./SongPerformers"
import { performerArtists, type SongPerformerView } from "@/lib/artists/performers"

type Song = { id: string; slug: string; title: string; lyrics?: string; chords?: string | null; difficulty?: string; assessment?: { level: Difficulty | null; hasChords: boolean }; artist?: { slug: string; category: string | null }; performers?: { artist: SongPerformerView }[] }
type Props = { category: string; artist: string; songs: Song[]; artistId?: string }

export default async function ArtistSongList({ category, artist, songs, artistId }: Props) {
  const admin = songs.length ? await contentAdmin() : null
  const statuses = new Map<string, ReviewStatus>()
  if (admin) {
    const reviews = await prisma.songReview.findMany({
      where: { songId: { in: songs.map(song => song.id) } },
      select: { songId: true, status: true },
    })
    for (const review of reviews) if (isReviewStatus(review.status)) statuses.set(review.songId, review.status)
  }
  return <ArtistSongRows category={category} artist={artist} artistId={artistId} songs={songs} statuses={admin ? statuses : undefined} />
}

export function ArtistSongRows({ category, artist, songs, statuses, artistId }: Props & { statuses?: Map<string, ReviewStatus> }) {
  return <><ul className={styles.list}>
    {songs.map(song => {
      const assessment = song.assessment ?? (() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- Server-only compatibility for legacy callers without supplied assessments.
        const { estimateDifficulty } = require("../../lib/music/difficulty") as typeof import("../../lib/music/difficulty")
        const result = estimateDifficulty(song)
        return { level: result.level, hasChords: result.chords.length > 0 }
      })()
      return <li key={song.id} className={styles.row}>
      <Link href={`/pesme/${encodeURIComponent(song.artist?.category ?? category)}/${encodeURIComponent(song.artist?.slug ?? artist)}/${encodeURIComponent(song.slug)}${artistId ? "?artist=" + encodeURIComponent(artistId) : ""}`} className={styles.link}>
        {assessment.hasChords ? "\uD83C\uDFB8 " : "\uD83C\uDFB5 "}
        {song.title}
        <span className={styles.difficulty}>{" \u2022 "}<SongDifficulty level={assessment.level} /></span>
      </Link>
      {statuses && <span className={styles.status}><SongReviewBadge status={statuses.get(song.id) ?? "unreviewed"} /></span>}
      <SongPerformers artists={performerArtists(song.performers)} compact />
    </li>})}
  </ul>{songs.length > 0 && <p className={styles.note}><UiText text={difficultyExplanation} /></p>}</>
}
