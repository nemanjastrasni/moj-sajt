"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { adminSongRequest } from "@/lib/adminSongs/client"
import { useI18n } from "./UiText"
import AdminDeleteDialog from "./AdminDeleteDialog"
import styles from "./AdminContent.module.css"

export type ContentActions = { id: string; name: string; editHref: string; kind: "song" | "artist"; biography?: boolean; version?: string; afterDelete?: string }
export default function AdminContentButtons({ id, name, editHref, kind, biography, version, afterDelete }: ContentActions) {
  const { t } = useI18n(), router = useRouter()
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function remove() {
    if (busy) return
    setBusy(true); setError("")
    try {
      const result = await adminSongRequest(`/api/admin/${kind === "song" ? "songs" : "artists"}/${encodeURIComponent(id)}`, "DELETE", kind === "song" ? { title: name } : { name, version })
      setOpen(false)
      if (kind === "song") router.replace(result.href || afterDelete || "/pesme")
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Brisanje nije uspelo.") }
    finally { setBusy(false) }
  }
  return <div className={styles.tools}>
    <Link href={editHref} className={styles.button}><Pencil />{t(kind === "song" ? "Izmeni pesmu" : "Izmeni izvodjaca")}</Link>
    {(kind === "song" || biography) && <button type="button" className={styles.button + " " + styles.danger} onClick={() => { setError(""); setOpen(true) }}><Trash2 />{t(kind === "song" ? "Obrisi pesmu" : "Obrisi biografiju")}</button>}
    {open && <AdminDeleteDialog open name={name} title={t(kind === "song" ? "Obrisi pesmu?" : "Obrisi biografiju?")} description={t(kind === "song" ? "Pesma ce biti obrisana iz baze, favorita i plejlisti. Izvodjac i ostale pesme ostaju." : "Brise se samo tekst biografije. Diskografija, fotografija, izvodjac i njegove pesme ostaju.")} busy={busy} error={error} close={() => setOpen(false)} confirm={() => void remove()} />}
  </div>
}
