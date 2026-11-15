"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useI18n } from "./UiText"
import type { ActivityInput } from "@/lib/engagement/model"

type Preference = { eligible: boolean; enabled: boolean }
type Value = { preference: Preference | null; loading: boolean; busy: boolean; error: string; reload: () => void; save: (enabled: boolean) => Promise<void>; record: (input: ActivityInput) => void }
const Context = createContext<Value | null>(null)
const failure = "Podešavanje statistike trenutno nije dostupno. Pokušaj ponovo."
export function EngagementProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession(), pathname = usePathname()
  const identity = status === "authenticated" ? session?.user?.id : undefined
  const admin = session?.user?.role === "admin"
  const [snapshot, setSnapshot] = useState<{ identity: string; preference: Preference } | null>(null)
  const [version, setVersion] = useState(0), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("")
  const currentIdentity = useRef(identity), sent = useRef(new Set<string>()), pending = useRef(new Set<AbortController>())
  currentIdentity.current = identity
  const preference = snapshot && snapshot.identity === identity ? snapshot.preference : null
  useEffect(() => {
    const controllers = pending.current
    sent.current.clear(); pending.current.forEach(controller => controller.abort()); pending.current.clear()
    setError(""); setBusy(false)
    if (!identity || admin) { setSnapshot(null); setLoading(false); return }
    let disposed = false
    const controller = new AbortController(), timer = window.setTimeout(() => controller.abort(), 8000)
    setLoading(true)
    fetch("/api/engagement/preferences", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw Error(failure); const value = await response.json(); if (typeof value.enabled !== "boolean" || typeof value.eligible !== "boolean") throw Error(failure); if (currentIdentity.current === identity) setSnapshot({ identity, preference: value }) })
      .catch(() => { if (currentIdentity.current === identity && !disposed) setError(failure) })
      .finally(() => { window.clearTimeout(timer); if (currentIdentity.current === identity) setLoading(false) })
    return () => { disposed = true; window.clearTimeout(timer); controller.abort(); controllers.forEach(controller => controller.abort()); controllers.clear() }
  }, [identity, admin, version])
  const record = useCallback((input: ActivityInput) => {
    if (!identity || admin || !preference?.enabled || busy || document.hidden) return
    const key = identity + ":" + new Date().toISOString().slice(0, 10) + ":" + input.kind
    if (sent.current.has(key)) return
    // At most four accepted events per account/day in this browser; server also deduplicates devices.
    if (sent.current.size > 32) sent.current.clear()
    sent.current.add(key)
    const controller = new AbortController(); pending.current.add(controller)
    const timer = window.setTimeout(() => controller.abort(), 8000)
    void fetch("/api/engagement", { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
      .then(response => { if (!response.ok) sent.current.delete(key) }).catch(() => sent.current.delete(key))
      .finally(() => { window.clearTimeout(timer); pending.current.delete(controller) })
  }, [identity, admin, preference?.enabled, busy])
  useEffect(() => {
    const active = () => record({ kind: "active" })
    active(); document.addEventListener("visibilitychange", active)
    // An untouched open tab must not create apparent return visits on subsequent days.
    document.addEventListener("pointerdown", active, { passive: true })
    document.addEventListener("keydown", active)
    return () => { document.removeEventListener("visibilitychange", active); document.removeEventListener("pointerdown", active); document.removeEventListener("keydown", active) }
  }, [record, pathname])
  async function save(enabled: boolean) {
    if (!identity || busy) return
    const actor = identity
    setBusy(true); setError("")
    pending.current.forEach(controller => controller.abort()); pending.current.clear()
    const controller = new AbortController(), timer = window.setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch("/api/engagement/preferences", { method: "PUT", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) })
      if (!response.ok) throw Error(failure)
      const value = await response.json()
      if (value.enabled !== enabled || value.eligible !== true) throw Error(failure)
      if (currentIdentity.current === actor) { setSnapshot({ identity: actor, preference: value }); sent.current.clear() }
    } catch { if (currentIdentity.current === actor) setError(failure) }
    finally { window.clearTimeout(timer); if (currentIdentity.current === actor) setBusy(false) }
  }
  return <Context.Provider value={{ preference, loading, busy, error, reload: () => setVersion(value => value + 1), save, record }}>{children}</Context.Provider>
}
export function useEngagement() { return useContext(Context) }
export function EngagementPreference() {
  const { t } = useI18n()
  const value = useEngagement(), { data: session } = useSession()
  if (!value) return null
  const { preference, loading, busy, error, save, reload } = value
  return <section className="mx-auto max-w-xl px-6 py-8" aria-labelledby="engagement-preference-title">
    <h2 id="engagement-preference-title" className="mb-3 text-xl font-bold">{t("Privatnost i statistika korišćenja")}</h2>
    <p className="mb-3 text-sm">{t("Dobrovoljno pomozi da vidimo koliko se korisnici vraćaju i koriste plejliste. Beležimo dan aktivnosti i da li si koristio pesmu iz plejliste, režim sviranja ili pokrenuo muziku. Ne beležimo koje pesme slušaš niti nazive, sadržaj i identifikatore lista, IP adresu ili istoriju pretrage.")}</p>
    <p className="mb-3 text-sm">{t("Dnevni podaci vezani su za tvoj nalog, koriste se za poslednjih 90 kalendarskih dana; stariji zapisi se brišu pri sledećem merenju ili pregledu, a administrator vidi zbirne rezultate. Isključivanje briše dosadašnje dnevne podatke i početak tvog perioda merenja. Nema dodatnih kolačića, praćenja gostiju ili reklamnih servisa. Odluku možeš promeniti ovde; funkcije sajta rade i bez uključivanja.")}</p>
    {session?.user?.role === "admin" || preference?.eligible === false ? <p>{t("Administratorski nalozi se ne mere.")}</p> : <>
      <label className="flex items-start gap-3"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" checked={Boolean(preference?.enabled)} disabled={!preference || loading || busy} onChange={event => void save(event.target.checked)} /><span>{t("Dozvoljavam opisano merenje korišćenja mog naloga.")}</span></label>
      <p className="mt-3 text-sm" role="status">{t(loading ? "Učitavam podešavanje…" : busy ? "Čuvam odluku…" : preference ? preference.enabled ? "Merenje je uključeno." : "Merenje je isključeno." : "Podešavanje nije učitano.")}</p>
      {error && <><p role="alert" className="mt-3 text-red-300">{t(error)}</p><button className="ui-button mt-3" type="button" disabled={busy || loading} onClick={reload}>{t("Pokušaj ponovo")}</button></>}
    </>}
  </section>
}
