"use client"
import { RefreshCw } from "lucide-react"
import styles from "./AdminSongs.module.css"

export default function AdminSongsError({ reset }: { reset: () => void }) {
  return <div className={styles.page}>
    <p role="alert" className={styles.error}>Podaci trenutno nisu dostupni. Pokusaj ponovo.</p>
    <button type="button" onClick={reset} className={styles.button}><RefreshCw />Pokusaj ponovo</button>
  </div>
}
