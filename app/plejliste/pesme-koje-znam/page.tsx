import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { playlistViewerId } from "@/lib/playlists/server"
import { playlistSongHref } from "@/lib/navigation/parent"
import { difficultyExplanation, playableLevel } from "@/lib/music/difficulty"
import { catalogPage, catalogPageNumber } from "@/lib/playlists/catalog-server"
import UiText from "@/app/components/UiText"
import SongDifficulty from "@/app/components/SongDifficulty"
import styles from "@/app/components/PlaylistClient.module.css"

export const dynamic = "force-dynamic"
export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await playlistViewerId()
  if (!userId) return <p><UiText text="Nisi ulogovan" /></p>
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { skillLevel: true } })
  const maximum = playableLevel(user?.skillLevel)
  const query = await searchParams ?? {}
  const { songs, total, pages, current } = await catalogPage("skill", null, catalogPageNumber(query.page), maximum)
  return <section className={styles.page}>
    <h1 className={styles.title}><UiText text="Pesme koje mogu da sviram" /></h1>
    <p className={styles.notice}><UiText text={difficultyExplanation} /></p>
    <Link className={styles.button} href="/profile"><UiText text="Promeni nivo u profilu" /></Link>
    <p className={styles.notice}><UiText text="Pronadjeno {count} pesama." values={{ count: total }} /></p>
    {!songs.length && <p><UiText text="Nema pesama u ovom izboru." /></p>}
    {songs.map(song => <div className={styles.row} key={song.id}>
      <Link translate="no" href={playlistSongHref(song, "/plejliste/pesme-koje-znam?page=" + current)}>{song.artist.name}{" - "}{song.title}</Link><span className={styles.level}><SongDifficulty level={song.level} /></span>
    </div>)}
    {pages > 1 && <nav className={styles.pagination}>
      {current > 1 && <Link className={styles.button} href={`?page=${current - 1}`}><UiText text="Prethodna" /></Link>}
      <span>{current} / {pages}</span>
      {current < pages && <Link className={styles.button} href={`?page=${current + 1}`}><UiText text="Sledeca" /></Link>}
    </nav>}
  </section>
}
