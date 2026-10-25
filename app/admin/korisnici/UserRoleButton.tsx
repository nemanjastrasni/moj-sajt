"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, ShieldMinus } from "lucide-react"
import { adminSongRequest } from "@/lib/adminSongs/client"
import styles from "../songs/AdminSongs.module.css"

export default function UserRoleButton({ user, currentId }: { user: { id: string; name: string | null; email: string | null; role: string; banned: boolean }; currentId: string }) {
  const router = useRouter()
  const [role, setRole] = useState(user.role), [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function changeRole() {
    if (busy) return
    const next = role === "admin" ? "user" : "admin"
    if (!window.confirm((next === "admin" ? "Dodeliti admin prava korisniku " : "Ukinuti admin prava korisniku ") + (user.email || user.name || user.id) + "?" + (next === "admin" ? " Administrator moze da menja i brise sadrzaj sajta i upravlja korisnicima." : ""))) return
    setBusy(true); setError("")
    try {
      const result = await adminSongRequest(`/api/admin/users/${encodeURIComponent(user.id)}/role`, "PATCH", { role: next, expectedRole: role, confirmed: true })
      if (result.user?.id !== user.id || result.user.role !== next) throw new Error("Proveri korisnicku ulogu osvezavanjem spiska.")
      setRole(next); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Izmena nije uspela.") }
    finally { setBusy(false) }
  }
  return <div className="min-w-0">
    <button type="button" disabled={busy || user.banned || user.id === currentId || !["user", "admin"].includes(role)} title={user.id === currentId ? "Sopstvenu admin ulogu ne mozes menjati ovim dugmetom." : undefined} className={styles.button} onClick={() => void changeRole()}>{role === "admin" ? <ShieldMinus /> : <ShieldCheck />}{busy ? "Cuvam..." : role === "admin" ? "Ukloni admina" : "Postavi za admina"}</button>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>
}
