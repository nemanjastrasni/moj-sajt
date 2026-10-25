"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Globe, LockKeyhole, Plus } from "lucide-react"
import { playlistRequest } from "@/lib/playlists/client"
import PlaylistActions from "./PlaylistActions"
import PlaylistNameDialog from "./PlaylistNameDialog"
import { CategoryLabel, useI18n } from "./UiText"
import styles from "./PlaylistClient.module.css"

export type PersonalPlaylist = { id: string; name: string; isPublic: boolean; category: string | null; songs: { song: { category: string } }[] }
export default function PersonalPlaylists({ playlists }: { playlists: PersonalPlaylist[] }) {
  const { t } = useI18n(), router = useRouter(), [create, setCreate] = useState(false), [query, setQuery] = useState("")
  const found = playlists.filter(playlist => playlist.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <section className={styles.page}>
    <div className={styles.header}><h1>{t("Moje plejliste")}</h1><button type="button" className={styles.button} onClick={() => setCreate(true)}><Plus />{t("Nova playlista")}</button></div>
    {playlists.length > 0 && <label className={styles.field}>{t("Pretrazi plejliste")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} /></label>}
    {!playlists.length && <p>{t("Nema playlisti.")}</p>}
    {playlists.length > 0 && !found.length && <p>{t("Nema rezultata.")}</p>}
    {found.map(playlist => {
      const categories = [...new Set(playlist.songs.map(item => item.song.category))]
      const category = categories.length > 1 ? "mix" : categories[0] ?? playlist.category ?? "mix"
      return <div className={styles.row} key={playlist.id}>
        <Link href={`/plejliste/${playlist.id}`}><strong translate="no">{playlist.name}</strong><span className={styles.meta}>{playlist.songs.length}{" "}{t("pesama")}{" · "}<CategoryLabel value={category} /></span></Link>
        <span className={styles.visibility} title={t(playlist.isPublic ? "Javna" : "Privatna")}>{playlist.isPublic ? <Globe /> : <LockKeyhole />}<span>{t(playlist.isPublic ? "Javna" : "Privatna")}</span></span>
        <div className={styles.actions}><PlaylistActions id={playlist.id} name={playlist.name} /></div>
      </div>
    })}
    {create && <PlaylistNameDialog close={() => setCreate(false)} save={async name => {
      const data = await playlistRequest<{ id: string; name: string }>("/api/playlist", "POST", { name, category: "mix" })
      if (typeof data.id !== "string" || data.name !== name) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
      router.push(`/plejliste/${encodeURIComponent(data.id)}`); router.refresh()
    }} />}
  </section>
}
