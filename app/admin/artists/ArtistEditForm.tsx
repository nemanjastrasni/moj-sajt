"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { adminSongRequest } from "@/lib/adminSongs/client"
import { validateArtistEdit } from "@/lib/adminContent/validation"
import { submissionCategories } from "@/lib/submissions/validation"
import styles from "../songs/AdminSongs.module.css"

export type EditableArtist = { id: string; name: string; category: string | null; image: string | null; bio: string | null; discography: unknown; version: string }
export default function ArtistEditForm({ initial, destination, backHref }: { initial: EditableArtist; destination: "artist" | "bio" | "info" | "list"; backHref: string }) {
  const router = useRouter()
  const [name, setName] = useState(initial.name), [category, setCategory] = useState(initial.category || "")
  const [image, setImage] = useState(initial.image || ""), [bio, setBio] = useState(initial.bio || "")
  const [discography, setDiscography] = useState(typeof initial.discography === "string" ? initial.discography : initial.discography == null ? "" : JSON.stringify(initial.discography, null, 2))
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError("")
    try {
      validateArtistEdit({ name, category, image, bio, discography, version: initial.version })
      setBusy(true)
      const result = await adminSongRequest(`/api/admin/artists/${encodeURIComponent(initial.id)}`, "PATCH", { name, category, image, bio, discography, version: initial.version })
      const href = destination === "list" ? backHref : destination === "bio" ? result.bioHref : destination === "info" ? result.infoHref : result.href
      if (!href) throw new Error("Izmene su sacuvane. Osvezi stranicu izvodjaca.")
      router.push(href); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cuvanje nije uspelo.") }
    finally { setBusy(false) }
  }
  return <div className={styles.page}>
    <div className={styles.heading}><h2>Izmeni izvodjaca</h2><Link href={backHref} className={styles.button}><ArrowLeft />Nazad</Link></div>
    <form onSubmit={submit} className={styles.form}><fieldset disabled={busy} className="space-y-5">
      <label>Naziv izvodjaca<input className={styles.input} required value={name} maxLength={200} onChange={event => setName(event.target.value)} /></label>
      <label>Kategorija<select className={styles.input} required value={category} onChange={event => setCategory(event.target.value)}><option value="">Izaberi kategoriju</option>{submissionCategories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Fotografija (lokalna putanja ili HTTPS URL)<input className={styles.input} value={image} maxLength={2000} onChange={event => setImage(event.target.value)} /></label>
      <label>Biografija<textarea className={styles.input} rows={16} value={bio} maxLength={100000} onChange={event => setBio(event.target.value)} /></label>
      <label>Diskografija (jedan album po redu ili JSON niz)<textarea className={styles.input + " " + styles.lyrics} rows={14} value={discography} maxLength={100000} spellCheck={false} onChange={event => setDiscography(event.target.value)} /></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="submit" disabled={busy} className={styles.button + " " + styles.primary}><Save />{busy ? "Cuvam..." : "Sacuvaj izmene"}</button>
    </fieldset></form>
  </div>
}
