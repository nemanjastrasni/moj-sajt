"use client"

import { useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, ShieldMinus } from "lucide-react"
import { adminSongRequest } from "@/lib/adminSongs/client"
import styles from "../songs/AdminSongs.module.css"

export default function UserRoleButton({ user, currentId }: { user: { id: string; name: string | null; email: string | null; role: string; banned: boolean }; currentId: string }) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId()
  const [role, setRole] = useState(user.role), [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function changeRole() {
    if (busy) return
    const next = role === "admin" ? "user" : "admin"
    setBusy(true); setError("")
    try {
      const result = await adminSongRequest(`/api/admin/users/${encodeURIComponent(user.id)}/role`, "PATCH", { role: next, expectedRole: role, confirmed: true })
      if (result.user?.id !== user.id || result.user.role !== next) throw new Error("Proveri korisnicku ulogu osvezavanjem spiska.")
      setRole(next); dialog.current?.close(); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Izmena nije uspela.") }
    finally { setBusy(false) }
  }
  return <div className="min-w-0">
    <button type="button" disabled={busy || user.banned || user.id === currentId || !["user", "admin"].includes(role)} title={user.id === currentId ? "Sopstvenu admin ulogu ne mozes menjati ovim dugmetom." : undefined} className={styles.button} onClick={() => {setError("");dialog.current?.showModal()}}>{role === "admin" ? <ShieldMinus /> : <ShieldCheck />}{busy ? "Cuvam..." : role === "admin" ? "Ukloni admina" : "Postavi za admina"}</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event=>{if(busy)event.preventDefault()}}>
      <h2 id={titleId}>{role === "admin" ? "Ukinuti admin prava?" : "Dodeliti admin prava?"}</h2>
      <p>{user.email || user.name || user.id}</p>
      <p>{role === "admin" ? "Korisnik više neće moći da upravlja sadržajem i korisnicima." : "Administrator može da menja i briše sadržaj sajta i upravlja korisnicima."}</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><button type="button" autoFocus disabled={busy} className={styles.button} onClick={()=>dialog.current?.close()}>Otkaži</button><button type="button" disabled={busy} className={styles.button + " " + styles.primary} onClick={()=>void changeRole()}><ShieldCheck aria-hidden="true" />{busy ? "Čuvam..." : "Potvrdi promenu"}</button></div>
    </dialog>
  </div>
}
