import Link from "next/link"
import { Users } from "lucide-react"
import { performerHref, type SongPerformerView } from "@/lib/artists/performers"
import UiText from "./UiText"
import styles from "./SongPerformers.module.css"

export default function SongPerformers({ artists, compact = false }: { artists: SongPerformerView[]; compact?: boolean }) {
  if (artists.length < 2) return null
  return <span className={`${styles.credit} ${compact ? styles.compact : ""}`}>
    <span className={styles.label}><Users size={16} aria-hidden="true" /><UiText text={artists.length === 2 ? "Duet" : "Saradnja"} /></span>
    <span>{artists.map((artist, index) => <span key={artist.id}>{index > 0 && " & "}<Link href={performerHref(artist)} translate="no">{artist.name}</Link></span>)}</span>
  </span>
}
