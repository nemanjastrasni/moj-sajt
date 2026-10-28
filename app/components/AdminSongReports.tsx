"use client"

import Link from "next/link"
import { useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, ExternalLink, Filter, Pencil, RefreshCw } from "lucide-react"
import { reportKindLabels, reportKinds, reportStatusLabels, reportStatuses, validateReportReview, type ReportFilters, type ReportStatus, type ReportView } from "@/lib/songReports/model"
import { reportRequest } from "@/lib/songReports/client"
import { useI18n } from "./UiText"
import styles from "./SongReports.module.css"

export type ReportList = { items: ReportView[]; total: number; totalPages: number; page: number }
function listHref(filters: ReportFilters, page: number) {
  return "/admin/prijave?" + new URLSearchParams({ status: filters.status, kind: filters.kind, page: String(page) })
}
export default function AdminSongReports({ data, filters }: { data: ReportList; filters: ReportFilters }) {
  const { t } = useI18n(), router = useRouter(), id = useId(), [notice, setNotice] = useState("")
  return <section className={styles.admin}>
    <h1>{t("Prijave gresaka")}</h1>
    <form action="/admin/prijave" method="get" className={styles.adminFilters}>
      <label htmlFor={id + "-status"}>{t("Status")}<select id={id + "-status"} name="status" defaultValue={filters.status}>{reportStatuses.map(value => <option key={value} value={value}>{t(reportStatusLabels[value])}</option>)}</select></label>
      <label htmlFor={id + "-kind"}>{t("Vrsta greske")}<select id={id + "-kind"} name="kind" defaultValue={filters.kind}><option value="">{t("Sve")}</option>{reportKinds.map(value => <option key={value} value={value}>{t(reportKindLabels[value])}</option>)}</select></label>
      <button type="submit" className={styles.button}><Filter aria-hidden="true" />{t("Filtriraj")}</button>
      <button type="button" className={styles.button} onClick={() => router.refresh()}><RefreshCw aria-hidden="true" />{t("Osvezi")}</button>
    </form>
    <p className={styles.meta}>{t("Ukupno prijava: {count}", { count: data.total })}</p>
    {notice && <p role="status" className={styles.success}>{t(notice)}</p>}
    {!data.items.length && <p className={styles.description}>{t("Nema prijava u ovom pregledu.")}</p>}
    {data.items.map(item => <ReportRow key={item.id + item.version} item={item} saved={() => { setNotice("Prijava je obradjena."); router.refresh() }} />)}
    <nav aria-label={t("Stranice prijava")} className={styles.pagination}>
      {data.page > 1 && <Link href={listHref(filters, data.page - 1)}><ArrowLeft aria-hidden="true" />{t("Prethodna")}</Link>}
      <span>{data.page} / {data.totalPages}</span>
      {data.page < data.totalPages && <Link href={listHref(filters, data.page + 1)}>{t("Sledeca")}<ArrowRight aria-hidden="true" /></Link>}
    </nav>
  </section>
}
function ReportRow({ item, saved }: { item: ReportView; saved: () => void }) {
  const { t, locale } = useI18n(), id = useId()
  const [status, setStatus] = useState<ReportStatus>(item.status), [note, setNote] = useState(item.note)
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [committed, setCommitted] = useState(false), running = useRef(false)
  return <article className={styles.report} data-report-id={item.id}>
    <div className={styles.reportHeader}><h2>{item.artist} - {item.title}</h2><span className={styles.badge} data-status={item.status}>{t(reportStatusLabels[item.status])}</span></div>
    <p className={styles.meta}>{t(reportKindLabels[item.kind])} · {item.reporter || t(item.reporterDeleted ? "Obrisan korisnik" : "Korisnik")} · {new Date(item.createdAt).toLocaleString(locale === "en" ? "en-GB" : "sr-Latn", { timeZone: "Europe/Belgrade" })} · {t("Transpozicija")}: {item.transpose > 0 ? "+" : ""}{item.transpose}</p>
    <p className={styles.description}>{item.description}</p>
    {item.songChanged && <p className={styles.warning}>{t("Pesma je menjana nakon prijave.")}</p>}
    <div className={styles.reportLinks}>
      {item.songHref ? <Link href={item.songHref} prefetch={false}><ExternalLink aria-hidden="true" />{t("Otvori pesmu")}</Link> : <span className={styles.meta}>{t("Pesma je obrisana.")}</span>}
      {item.editHref && <Link href={item.editHref} prefetch={false}><Pencil aria-hidden="true" />{t("Izmeni pesmu")}</Link>}
    </div>
    <form onSubmit={async event => {
      event.preventDefault()
      if (running.current || committed) return
      setError("")
      let input
      try { input = validateReportReview({ status, note, version: item.version }) }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Neispravni podaci prijave."); return }
      running.current = true; setBusy(true)
      try {
        const result = await reportRequest(`/api/admin/song-reports/${encodeURIComponent(item.id)}`, "PATCH", input)
        if (result.id !== item.id || result.status !== status) throw new Error("Odgovor prijave nije ispravan. Osvezi prikaz.")
        setCommitted(true); saved()
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Prijave trenutno nisu dostupne. Pokusaj kasnije.") }
      finally { running.current = false; setBusy(false) }
    }}>
      <fieldset disabled={busy || committed} className={styles.reviewFields}>
        <label htmlFor={id + "-status"}>{t("Status")}<select id={id + "-status"} value={status} onChange={event => setStatus(event.target.value as ReportStatus)}>{reportStatuses.map(value => <option key={value} value={value}>{t(reportStatusLabels[value])}</option>)}</select></label>
        <label htmlFor={id + "-note"}>{t("Napomena administratora")}<textarea id={id + "-note"} rows={2} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} required={status === "dismissed"} /></label>
      </fieldset>
      {error && <p role="alert" className={styles.error}>{t(error)}</p>}
      <button type="submit" className={styles.button} disabled={busy || committed || status === item.status && note === item.note}><Check aria-hidden="true" />{t(busy ? "Cuvam..." : "Sacuvaj")}</button>
    </form>
  </article>
}
