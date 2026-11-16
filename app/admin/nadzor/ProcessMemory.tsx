"use client"

import { useEffect, useRef, useState } from "react"
import { isProcessMemorySnapshot, memoryMiB, processDuration, type ProcessMemorySnapshot } from "@/lib/monitoring/process-memory-model"
import styles from "./ProcessMemory.module.css"

export default function ProcessMemory() {
  const [sample, setSample] = useState<ProcessMemorySnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort(); request.current = null }, [])

  async function refresh() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError("")
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      const response = await fetch("/api/admin/process-memory", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      if (request.current !== controller) return
      if (response.status === 401 || response.status === 403) {
        setSample(null); setError("Pristup nije dozvoljen. Prijavi se kao administrator.")
        return
      }
      if (!response.ok) throw Error("unavailable")
      const data: unknown = await response.json()
      if (!isProcessMemorySnapshot(data)) throw Error("invalid-response")
      if (request.current === controller && !controller.signal.aborted) setSample(data)
    } catch {
      if (request.current === controller) setError("Merenje nije uspelo. Pokušaj ponovo.")
    } finally {
      clearTimeout(timeout)
      if (request.current === controller) { request.current = null; setBusy(false) }
    }
  }

  return <section className={styles.panel} aria-labelledby="process-memory-heading">
    <div className={styles.heading}>
      <h2 id="process-memory-heading">Memorija procesa</h2>
      <button type="button" className="ui-button" disabled={busy} onClick={refresh} aria-busy={busy}>{busy ? "Merenje…" : sample ? "Osveži merenje" : "Prikaži memoriju"}</button>
    </div>
    <p>Meri se samo Node proces koji odgovori na zahtev, a ne ukupna memorija Render instance. Vrednosti se učitavaju ručno; nema stalnog praćenja ni čuvanja istorije.</p>
    <div aria-live="polite" aria-atomic="true">
      {sample && <>
        <p className={styles.meta}>{error ? "Prethodno merenje" : "Poslednje merenje"}: <time dateTime={sample.measuredAt}>{new Intl.DateTimeFormat("sr-Latn", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Belgrade" }).format(new Date(sample.measuredAt))}</time> (Beograd). Proces: {sample.instanceId.slice(0, 8)}. Radi: {processDuration(sample.uptimeSeconds)}.</p>
        <dl className={styles.grid}>
          <div><dt>RAM procesa (RSS)</dt><dd>{memoryMiB(sample.rssBytes)}</dd></div>
          <div><dt>JavaScript memorija</dt><dd>{memoryMiB(sample.heapUsedBytes)}<small>od {memoryMiB(sample.heapTotalBytes)} rezervisano</small></dd></div>
          <div><dt>Spoljna memorija</dt><dd>{memoryMiB(sample.externalBytes)}</dd></div>
          <div><dt>ArrayBuffer memorija</dt><dd>{memoryMiB(sample.arrayBuffersBytes)}<small>već uključena u spoljnu memoriju</small></dd></div>
          <div><dt>Najviši RSS od pokretanja</dt><dd>{sample.peakRssBytes === null ? "Nije dostupno" : memoryMiB(sample.peakRssBytes)}</dd></div>
        </dl>
      </>}
      {!sample && !error && <p className={styles.meta}>Klikni „Prikaži memoriju“ za jedno merenje.</p>}
    </div>
    {error && <p role="alert" className={styles.error}>{error}{sample ? " Prikazani podaci su iz prethodnog uspešnog merenja." : ""}</p>}
    <p className={styles.meta}>Ove vrednosti se ne sabiraju. Rast kroz nekoliko merenja sam po sebi ne dokazuje curenje memorije; JavaScript povremeno oslobađa zauzetu memoriju. Posle restarta ili odgovora drugog procesa menjaju se oznaka procesa i početak merenja maksimuma. Za ukupnu potrošnju i limit instance merodavni su Render podaci.</p>
  </section>
}
