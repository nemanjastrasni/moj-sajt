import { ExternalLink, ShieldCheck } from "lucide-react"
import { MONITOR_WORKFLOW_URL, monitorScheduleNotice, readMonitorHistory } from "@/lib/monitoring/server"

export const dynamic = "force-dynamic"
const date = (value: string) => new Intl.DateTimeFormat("sr-Latn", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Belgrade" }).format(new Date(value))
const eventName = (value: string) => ({ schedule: "Dnevna provera", workflow_dispatch: "Ručno pokretanje", push: "Provera posle izmene" })[value] || "Pokretanje"
const runStatus = (status: string, conclusion: string | null) => status !== "completed" ? "U toku / na čekanju" : conclusion === "success" ? "Završeno — proveri nalaze" : conclusion === "failure" ? "Problem — otvori izveštaj" : "Prekinuto ili nije završeno"

export default async function MonitorPage() {
  const history = await readMonitorHistory()
  return <section className="admin-page admin-monitor">
    <div className="admin-heading"><h1>Nadzor sajta</h1><a className="ui-button" href={MONITOR_WORKFLOW_URL} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />GitHub Actions</a></div>
    <p className="admin-monitor-notice"><ShieldCheck aria-hidden="true" /><span>{monitorScheduleNotice(history)}</span></p>
    <h2>Šta nadzor radi</h2>
    <p>Proverava dostupnost javnih stranica, sitemap, SEO oznake i zabranu anonimnog pristupa admin podacima. Svakog dana proverava drugi uzorak pesama. Radi na GitHub serveru i kada je tvoj računar isključen.</p>
    <p>Raspored: 04:23 UTC, odnosno 05:23 zimi i 06:23 leti po našem vremenu. GitHub može odložiti pokretanje. Istorija u panelu može kasniti do pet minuta.</p>
    <h2>AI i odobrenja</h2>
    <p>Ako je dodat OpenAI API ključ, AI analizira pronađene probleme pri dnevnom pokretanju. Njeni predlozi čekaju tvoju proveru i odobrenje. U ovoj fazi nema automatskih upisa u bazu, brisanja, menjanja koda niti objavljivanja izmena.</p>
    <p className="admin-muted">Bez API ključa rade redovne provere. Ovaj panel ne proverava da li je ključ podešen; stvarni status AI analize piše u izveštaju svakog pokretanja.</p>
    <h2>Dnevnik pokretanja</h2>
    <p className="admin-muted">Otvori pokretanje za sažetak i preuzmi „site-monitor“ izveštaj iz odeljka Artifacts. Izveštaji se čuvaju 30 dana. Za preuzimanje može biti potrebna GitHub prijava. Upozorenja mogu postojati i kada je pokretanje zeleno.</p>
    {history.runs.length > 0 && <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Istorija nadzora"><table className="admin-table"><thead><tr><th scope="col">Početak</th><th scope="col">Vrsta</th><th scope="col">Rezultat</th></tr></thead><tbody>{history.runs.slice(0, 10).map(run => <tr key={run.id}><td><time dateTime={run.startedAt}>{date(run.startedAt)}</time></td><td>{eventName(run.event)}</td><td><a href={run.url} target="_blank" rel="noopener noreferrer">{runStatus(run.status, run.conclusion)}</a></td></tr>)}</tbody></table></div>}
    <p className="admin-muted admin-stat-time">Istorija proverena: <time dateTime={history.checkedAt}>{date(history.checkedAt)}</time>. Nadzor javnih stranica ne potvrđuje Google indeksiranje, potpunu bezbednost niti ispravnost svake pesme.</p>
  </section>
}
