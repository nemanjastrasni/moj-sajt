"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

type Artist = { id: string; name: string; songs: number }
type Preview = {
  version: string; source: Artist; target: Artist; total: number; creditedSongs: number
  collisions: { id: string; title: string; oldSlug: string; slug: string }[]
  conflicts: { field: string; source: unknown; target: unknown }[]; copied: string[]
  identityConflict?: { sourceWikidataId: string; targetWikidataId: string } | null
}
const labels: Record<string, string> = { bio: "Biografija", bioShort: "Kratka biografija", discography: "Diskografija", image: "Fotografija", members: "Članovi" }
const Selection = createContext<{ selected: string[]; toggle: (id: string) => void; busy: boolean }>({ selected: [], toggle() {}, busy: false })

export function ArtistMergeCheckbox({ id, name }: { id: string; name: string }) {
  const { selected, toggle, busy } = useContext(Selection)
  return <input type="checkbox" aria-label={`Označi za spajanje: ${name}`} checked={selected.includes(id)} disabled={busy || selected.length === 2 && !selected.includes(id)} onChange={() => toggle(id)} className="artist-merge-checkbox" />
}

export default function ArtistMergeSelection({ artists, children, initialSelected = [] }: { artists: Artist[]; children: ReactNode; initialSelected?: string[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(initialSelected.filter(id => artists.some(a => a.id === id)).slice(0, 2))
  const [targetId, setTargetId] = useState("")
  const [choices, setChoices] = useState<Record<string, "source" | "target">>({})
  const [preview, setPreview] = useState<Preview | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [identityConfirmed, setIdentityConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const pair = artists.filter(a => selected.includes(a.id))
  function reset() { setPreview(null); setConfirmed(false); setIdentityConfirmed(false); setChoices({}); setError(""); setSuccess("") }
  function toggle(id: string) { reset(); setTargetId(""); setSelected(old => old.includes(id) ? old.filter(x => x !== id) : old.length < 2 ? [...old, id] : old) }
  async function request(action: "preview" | "apply") {
    if (busy || pair.length !== 2 || !selected.includes(targetId)) return
    if (action === "apply" && (!preview || !confirmed || preview.identityConflict && !identityConfirmed)) return
    setBusy(true); setError("")
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000)
    try {
      const response = await fetch("/api/admin/artists/merge", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, sourceId: selected.find(id => id !== targetId), targetId, choices, ...(action === "apply" ? { confirmed, identityConfirmed, version: preview?.version } : {}) }) })
      const data = await response.json()
      if (!response.ok || data.success !== true) throw new Error(data.error || "Spajanje nije uspelo.")
      if (action === "preview") { if (!data.preview?.version) throw new Error("Pregled nije dostupan."); setPreview(data.preview); setConfirmed(false); setIdentityConfirmed(false) }
      else { setSuccess(`Spajanje je završeno. ${preview?.target.name}: ukupno ${preview?.total} pesama.`); setSelected([]); setPreview(null); setTargetId(""); setConfirmed(false); setIdentityConfirmed(false); router.refresh() }
    } catch (e) {
      setError(e instanceof Error && e.name !== "AbortError" && !(e instanceof TypeError) ? e.message : "Veza je prekinuta ili zahtev traje predugo. Proveri listu pre ponovnog pokušaja.")
      // A failed response may arrive after a successful commit. Always obtain a fresh preview.
      setPreview(null); setConfirmed(false); setIdentityConfirmed(false); router.refresh()
    } finally { clearTimeout(timer); setBusy(false) }
  }
  return <Selection.Provider value={{ selected, toggle, busy }}>
    <section aria-label="Spajanje izvođača" className="artist-merge-panel">
      <p>Označi dva ista izvođača u tabeli, pa izaberi naziv koji ostaje.</p>
      <p className="admin-muted" aria-live="polite">Označeno: {selected.length}/2{pair.length > 0 ? ` · ${pair.map(a => a.name).join(" + ")}` : ""}</p>
      {selected.length > 0 && <button type="button" className="ui-button" disabled={busy} onClick={() => { reset(); setSelected([]); setTargetId("") }}>Poništi izbor</button>}
      {pair.length === 2 && <fieldset disabled={busy} className="artist-merge-targets">
        <legend>Koji naziv i profil ostaju?</legend>
        {pair.map(a => <label key={a.id}><input type="radio" name="merge-target" value={a.id} checked={targetId === a.id} onChange={() => { reset(); setTargetId(a.id) }} /> {a.name} ({a.songs} pesama)</label>)}
        {!preview && <button type="button" className="ui-button ui-button-primary" disabled={!targetId || busy} onClick={() => request("preview")}>{busy ? "Učitavanje…" : "Pregled spajanja"}</button>}
      </fieldset>}
      {preview && <div className="artist-merge-preview" aria-label="Pregled spajanja">
        <h2>{preview.source.name} → {preview.target.name}</h2>
        {preview.identityConflict && <fieldset disabled={busy} aria-label="Dodatna potvrda izvođača">
          <legend>Da li si siguran da je ovo isti izvođač?</legend>
          <p>Izvori imaju različite Wikidata oznake. Spajanje možeš da nastaviš uz dodatnu potvrdu.</p>
          <label className="artist-merge-confirm"><input type="checkbox" checked={identityConfirmed} onChange={e => setIdentityConfirmed(e.target.checked)} /> Da, siguran sam da je ovo isti izvođač. Dozvoli spajanje.</label>
        </fieldset>}
        <p>Prebacuje se {preview.source.songs} pesama. Ostaje <strong>{preview.target.name}</strong> sa ukupno {preview.total} pesama. Duplikat izvođača se uklanja tek posle prenosa.</p>
        <p>Sačuvane ostaju sve pesme, omiljene, plejliste i postojeće veze. Stari javni linkovi se preusmeravaju. Prethodni podaci izvođača i izvori ostaju u evidenciji spajanja.</p>
        {preview.creditedSongs > 0 && <p>Ažuriraju se i veze u {preview.creditedSongs} dueta / zajedničkih izvođenja, uz očuvan redosled ostalih izvođača.</p>}
        {preview.copied.length > 0 && <p>Dopunjavaju se podaci: {preview.copied.map(f => labels[f]).join(", ")}.</p>}
        {preview.collisions.length > 0 && <details><summary>{preview.collisions.length} istih oznaka pesama — sačuvaće se oba zapisa</summary><ul>{preview.collisions.map(s => <li key={s.id}>{s.title}: {s.oldSlug} → {s.slug}</li>)}</ul></details>}
        {preview.conflicts.map(c => <fieldset key={c.field} disabled={busy}><legend>{labels[c.field]} se razlikuje — izaberi podatke za zajednički profil</legend>{(["target", "source"] as const).map(side => <label key={side} className="artist-merge-conflict"><input type="radio" name={`merge-${c.field}`} checked={(choices[c.field] ?? "target") === side} onChange={() => { setChoices(old => ({ ...old, [c.field]: side })); setConfirmed(false); setIdentityConfirmed(false) }} /> {side === "target" ? preview.target.name : preview.source.name}<details><summary>Prikaži podatke</summary><pre>{typeof c[side] === "string" ? c[side] : JSON.stringify(c[side], null, 2)}</pre></details></label>)}</fieldset>)}
        <p>Spajanje je trajno; nema dugmeta za automatsko poništavanje.</p>
        <label className="artist-merge-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} /> Potvrđujem da su ovo isti izvođači i da ostaje {preview.target.name}.</label>
        <button type="button" className="ui-button ui-button-primary" disabled={!confirmed || busy || !!preview.identityConflict && !identityConfirmed} onClick={() => request("apply")}>{busy ? "Spajanje…" : `Spoji u ${preview.target.name}`}</button>
      </div>}
      {error && <p role="alert" className="artist-merge-error">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
    {children}
  </Selection.Provider>
}
