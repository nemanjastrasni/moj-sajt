"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { adminSongRequest } from "@/lib/adminSongs/client"
import styles from "./AdminSongs.module.css"

export default function DeleteSongButton({ id, title, artist }: { id: string; title: string; artist: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [removed, setRemoved] = useState(false)
  async function remove() {
    if (busy) return
    setBusy(true); setError("")
    try {
      await adminSongRequest("/api/admin/songs/" + encodeURIComponent(id), "DELETE", { title })
      setRemoved(true); dialog.current?.close(); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Brisanje nije uspelo.") }
    finally { setBusy(false) }
  }
  return <>
    <button type="button" className={`${styles.icon} ${styles.danger}`} disabled={removed} title={`Obrisi: ${title}`} aria-label={`Obrisi: ${title}`}
      onClick={() => { setError(""); dialog.current?.showModal() }}><Trash2 /></button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={`delete-${id}`} onCancel={event => { if (busy) event.preventDefault() }}>
      <h2 id={`delete-${id}`}>Obrisati pesmu?</h2>
      <p><strong>{title}</strong><br />{artist}</p>
      <p>Pesma ce biti uklonjena i iz favorita i plejlista. Plejliste i izvodjac ostaju sacuvani. Brisanje je trajno.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" autoFocus disabled={busy} onClick={() => dialog.current?.close()} className={styles.button}>Otkazi</button>
        <button type="button" disabled={busy} onClick={() => void remove()} className={`${styles.button} ${styles.danger}`}><Trash2 />{busy ? "Brisem..." : "Obrisi pesmu"}</button>
      </div>
    </dialog>
  </>
}
