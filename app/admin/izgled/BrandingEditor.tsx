"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react"
import { type BrandingConfig } from "@/lib/branding/model"
import { saveBrandingAction } from "./actions"

type State = { available: boolean; config: BrandingConfig; version: string; updatedAt: string | null }
export default function BrandingEditor({ initial }: { initial: State }) {
  const [config, setConfig] = useState(initial.config), [version, setVersion] = useState(initial.version), [updatedAt, setUpdatedAt] = useState(initial.updatedAt)
  const [pending, setPending] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("")
  function change(id: string, patch: Partial<BrandingConfig["slogans"][number]>) { setMessage(""); setError(""); setConfig(value => ({ ...value, slogans: value.slogans.map(item => item.id === id ? { ...item, ...patch } : item) })) }
  function move(index: number, offset: number) { setMessage(""); setConfig(value => { const slogans = [...value.slogans]; [slogans[index], slogans[index + offset]] = [slogans[index + offset], slogans[index]]; return { ...value, slogans } }) }
  return <form className="admin-form admin-branding-form" onSubmit={async event => {
    event.preventDefault(); if (pending || !initial.available) return
    setPending(true); setError(""); setMessage("")
    try {
      const result = await saveBrandingAction({ config, version })
      if (!result.ok) { setError(result.error); return }
      setConfig(result.config); setVersion(result.version); setUpdatedAt(result.updatedAt); setMessage("Slogani su sačuvani. Novo otvaranje početne strane učitava ovu listu.")
    } catch { setError("Veza je prekinuta. Pre ponovnog čuvanja osveži stranicu i proveri sačuvanu listu.") }
    finally { setPending(false) }
  }}>
    <fieldset disabled={pending || !initial.available}>
      <div className="admin-branding-options"><label className="admin-branding-check"><input type="checkbox" checked={config.rotate} onChange={event => { setMessage(""); setConfig({ ...config, rotate: event.target.checked }) }} />Automatski smenjuj slogane</label><label>Interval u sekundama<input className="ui-input" type="number" min={6} max={60} required value={config.intervalSeconds} onChange={event => { setMessage(""); setConfig({ ...config, intervalSeconds: Number(event.target.value) }) }} /></label></div>
      <p className="admin-muted">Do 50 slogana, najviše 160 znakova po tekstu. Engleski prevod je opcion: ako ga nema, prikazuje se srpski tekst. Posetioci mogu pauzirati smenjivanje.</p>
      <ol className="admin-branding-list">{config.slogans.map((item, index) => <li key={item.id} className="admin-branding-item">
        <div className="admin-heading"><strong>Slogan {index + 1}</strong><div className="admin-row-actions"><button className="ui-button" type="button" disabled={index === 0} aria-label={`Pomeri slogan ${index + 1} gore`} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" /></button><button className="ui-button" type="button" disabled={index === config.slogans.length - 1} aria-label={`Pomeri slogan ${index + 1} dole`} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" /></button><button className="ui-button" type="button" disabled={config.slogans.length === 1} aria-label={`Ukloni slogan ${index + 1} iz nacrta`} onClick={() => { setMessage(""); setConfig({ ...config, slogans: config.slogans.filter(row => row.id !== item.id) }) }}><Trash2 aria-hidden="true" /></button></div></div>
        <label>Tekst na srpskom<textarea className="ui-input" rows={2} required maxLength={160} value={item.text} onChange={event => change(item.id, { text: event.target.value })} /></label>
        <label>Tekst na engleskom (opciono)<textarea className="ui-input" rows={2} maxLength={160} value={item.textEn} onChange={event => change(item.id, { textEn: event.target.value })} /></label>
        <label className="admin-branding-check"><input type="checkbox" checked={item.enabled} onChange={event => change(item.id, { enabled: event.target.checked })} />Prikazuj ovaj slogan</label>
      </li>)}</ol>
      <div className="admin-row-actions"><button type="button" className="ui-button" disabled={config.slogans.length >= 50} onClick={() => { setMessage(""); setConfig({ ...config, slogans: [...config.slogans, { id: crypto.randomUUID(), text: "", textEn: "", enabled: true }] }) }}><Plus aria-hidden="true" />Dodaj slogan</button><button type="submit" className="ui-button ui-button-primary"><Save aria-hidden="true" />{pending ? "Čuvam..." : "Sačuvaj slogane"}</button></div>
    </fieldset>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {updatedAt && <p className="admin-muted">Poslednja izmena: <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString("sr-Latn", { timeZone: "Europe/Belgrade" })}</time>. Svaka sačuvana izmena čuva prethodno i novo stanje u dnevniku baze.</p>}
  </form>
}
