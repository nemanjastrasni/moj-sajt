"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useI18n } from "./UiText"
import { countryName, PRESENCE_EVENT, publicPresence, validSnapshot, type PresenceSnapshot } from "@/lib/presence/model"
import styles from "./AdminPresence.module.css"

const Context = createContext<{ snapshot: PresenceSnapshot | null; now: number } | null>(null)
export function AdminPresenceProvider({ initial, children }: { initial: PresenceSnapshot | null; children: ReactNode }) {
  const { t } = useI18n(), router = useRouter()
  const [snapshot, setSnapshot] = useState(initial), [now, setNow] = useState(initial ? Date.parse(initial.checkedAt) : 0)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [revoked, setRevoked] = useState(false)
  const running = useRef<AbortController | null>(null)
  const load = useCallback(async () => {
    if (running.current || document.visibilityState === "hidden") return
    const controller = new AbortController()
    running.current = controller; setBusy(true)
    let expired = false
    const deadline = window.setTimeout(() => { expired = true; controller.abort() }, 10000)
    try {
      const response = await fetch("/api/admin/online", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      if (response.status === 401 || response.status === 403) { setSnapshot(null); setRevoked(true); router.refresh(); return }
      if (!response.ok) throw Error("unavailable")
      const value = await response.json()
      if (!validSnapshot(value)) throw Error("invalid")
      if (controller.signal.aborted) return
      setSnapshot(value); setNow(Date.now()); setError("")
      window.dispatchEvent(new CustomEvent(PRESENCE_EVENT, { detail: publicPresence(value) }))
    } catch { if (expired || !controller.signal.aborted) setError("Prisustvo trenutno nije dostupno. Podaci mozda nisu azurni.") }
    finally { window.clearTimeout(deadline); if (running.current === controller) { running.current = null; setBusy(false) } }
  }, [router])
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { setNow(Date.now()); void load() }, 15000)
    const visible = () => { if (document.visibilityState === "visible") void load() }
    document.addEventListener("visibilitychange", visible)
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); running.current?.abort(); running.current = null }
  }, [load])
  if (revoked) return <p role="alert">{t("Pristup admin pregledu vise nije dozvoljen.")}</p>
  return <Context.Provider value={{ snapshot, now }}>
    <section id="online" className={styles.summary}>
      <div className={styles.counts}>
        <span>{t("Ukupno prisutnih")}: <strong>{snapshot?.total ?? "-"}</strong></span>
        <span>{t("Ulogovani")}: <strong>{snapshot?.loggedIn ?? "-"}</strong></span>
        <span>{t("Gosti")}: <strong>{snapshot?.guests ?? "-"}</strong></span>
      </div>
      <button type="button" onClick={() => void load()} disabled={busy} className={styles.refresh} title={t("Osvezi prisustvo")} aria-label={t("Osvezi prisustvo")}><RefreshCw size={18} className={busy ? "animate-spin" : ""} /></button>
      <p className={styles.meta}>{t("Aktivnost u poslednja 2 minuta")}{snapshot ? ` · ${t("Osvezeno")}: ${new Date(snapshot.checkedAt).toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Belgrade" })}` : ""}</p>
      {(error || !snapshot) && <p role="alert" className={styles.error}>{t(error || "Prisustvo trenutno nije dostupno. Podaci mozda nisu azurni.")}</p>}
    </section>
    {children}
  </Context.Provider>
}
function ago(value: string | undefined, now: number) {
  if (!value) return "-"
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)} min`
}
export function UserPresenceCells({ userId }: { userId: string }) {
  const { t, locale } = useI18n(), context = useContext(Context)
  const snapshot = context?.snapshot, user = snapshot?.users[userId]
  return <>
    <td data-label="Online" className="p-2"><span className={styles.status}><span aria-hidden="true" className={styles.dot + (user?.online ? " " + styles.online : "")} />{!snapshot ? "-" : user?.online ? "Online" : "Offline"}</span></td>
    <td data-label={t("Zemlja posete (priblizno)")} className="p-2">{user?.online ? user.countries.map(code => countryName(code, locale)).filter(Boolean).join(", ") || t("Nepoznato") : "-"}</td>
    <td data-label={t("Poslednja aktivnost")} className="p-2 whitespace-nowrap">{ago(user?.lastSeen, context?.now ?? 0)}</td>
  </>
}
export function GuestPresenceList() {
  const { t, locale } = useI18n(), context = useContext(Context)
  const guests = context?.snapshot?.visitors
  return <section className={styles.guests}>
    <h2 className="mb-3 text-lg font-semibold">{t("Gosti trenutno online")}</h2>
    {!guests ? <p>-</p> : !guests.length ? <p>{t("Nema trenutno aktivnih gostiju.")}</p> : <ul>
      {guests.map((guest, index) => <li key={guest.id}><span>{t("Gost")} #{index + 1}</span><span>{countryName(guest.countryCode, locale) || t("Nepoznato")}</span><span>{ago(guest.lastSeen, context?.now ?? 0)}</span></li>)}
    </ul>}
  </section>
}
