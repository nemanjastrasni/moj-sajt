import { ExternalLink } from "lucide-react"
import type { MonitorDetails, MonitorRun } from "@/lib/monitoring/server"
import { publicPath } from "@/scripts/lib/site-monitor.cjs"

const descriptions: Record<string, [string, string, string]> = {
  robots_http: ["Robots.txt nije dostupan", "Pretraživač nije mogao da učita pravila za robote.", "Proveriti HTTP odgovor i objavu robots.txt."],
  robots_sitemap: ["Veza ka sitemapu nije usklađena", "Robots.txt ne navodi očekivanu adresu sitemapa.", "Uporediti domen u robots.txt, sitemapu i podešavanjima sajta."],
  sitemap_http: ["Sitemap nije dostupan", "Glavni spisak javnih stranica nije uspešno učitan.", "Proveriti sitemap.xml i poslednji deploy."],
  sitemap_index: ["Struktura sitemapa nije prepoznata", "Glavni sitemap nema očekivan indeks delova.", "Proveriti generisani XML i odgovor servera."],
  sitemap_origin: ["Sitemap upućuje na neočekivanu adresu", "Deo sitemapa ima drugi domen ili neočekivanu putanju; ta adresa nije otvarana.", "Proveriti izvor adresiranja i tačan domen."],
  sitemap_partition_http: ["Deo sitemapa nije dostupan", "Jedan XML deo spiska javnih stranica nije uspešno učitan.", "Otvoriti navedeni XML i proveriti server i izvor podataka."],
  empty_sitemap: ["Prazan deo sitemapa", "U ovom delu nije pronađena javna adresa.", "Proveriti da li je prazna kategorija očekivana."],
  oversized_sitemap: ["Sitemap prelazi dozvoljeni obim", "XML deo sadrži previše adresa.", "Podeliti spisak na manje delove i ponoviti proveru."],
  sitemap_private_or_foreign: ["Sitemap sadrži nedozvoljenu ili neprepoznatu adresu", "Navedeni XML sadrži adresu koju monitor ne prihvata kao javnu. To može biti i propust u dozvoljenoj listi monitora.", "Uporediti konkretan XML sa javnim rutama; privatne adrese ukloniti iz sitemapa tek posle potvrde."],
  sitemap_duplicate: ["Adresa se ponavlja u sitemapu", "Ista javna adresa navedena je više puta.", "Proveriti sastavljanje sitemapa, bez brisanja pesama."],
  song_sitemap_empty: ["Nema pesama u sitemapu", "U učitanim delovima nije pronađena nijedna adresa pesme.", "Proveriti generisanje adresa pesama i dostupnost kataloga."],
  robots_blocks_public: ["Robots pravila blokiraju javnu stranicu", "Za navedenu putanju pronađeno je pravilo koje zabranjuje pristup robotima.", "Proveriti da li je zabrana namerna pre izmene pravila."],
  page_http: ["Stranica nije vratila HTTP 200", "Javna stranica nije uspešno odgovorila ili se preusmerava. Monitor ne prati preusmerenja.", "Otvoriti stranicu i proveriti status, canonical adresu i eventualni stari link."],
  canonical: ["Proveriti glavnu adresu stranice", "Canonical oznaka nedostaje, ponavlja se ili ne odgovara otvorenoj putanji.", "Uporediti canonical oznaku sa adresom ove stranice."],
  title: ["Nedostaje naslov za pretraživače", "U HTML-u nije pronađen popunjen title.", "Dopuniti metadata naslov za ovu stranicu."],
  description: ["Nedostaje opis za pretraživače", "Meta description nije popunjen.", "Dodati kratak opis koji odgovara sadržaju stranice."],
  heading: ["Proveriti glavni naslov", "Stranica nema tačno jedan H1 naslov.", "Proveriti strukturu naslova, uz očuvanje izgleda."],
  public_noindex: ["Javna stranica ima noindex oznaku", "Stranica traži da se ne indeksira. To može biti namerno.", "Potvrditi namenu stranice pre uklanjanja noindex oznake."],
  structured_json: ["Neispravni strukturirani podaci", "Jedan JSON-LD blok nije ispravan JSON.", "Proveriti generisanje i validnost strukturiranih podataka."],
  website_schema: ["Nedostaje WebSite podatak", "Početna strana nema očekivane strukturirane podatke o sajtu.", "Proveriti JSON-LD početne strane."],
  breadcrumb_schema: ["Nedostaje strukturirana putanja", "Nisu pronađeni očekivani BreadcrumbList podaci.", "Proveriti strukturiranu putanju ove stranice."],
  admin_access: ["Proveriti zaštitu admin podataka", "Anonimni zahtev nije dobio očekivanu zabranu 401 ili 403. Moguć je i kvar servera; ovo samo po sebi ne dokazuje otkrivanje podataka.", "Hitno proveriti odgovor admin API-ja i ovlašćenja, bez otvaranja pristupa."],
  monitor_incomplete: ["Nadzor nije završen", "Provera je prekinuta ili je iscrpela svoj dozvoljeni obim.", "Pregledati korake pokretanja i ponoviti proveru; rezultat nije potvrda ispravnosti sajta."],
}
const date = (value: string) => new Intl.DateTimeFormat("sr-Latn", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Belgrade" }).format(new Date(value))
const labels = { critical: "Visok prioritet", warning: "Za proveru", info: "Informacija" }
const aiStates: Record<string,string> = {
  "advice-ready":"predlozi su pripremljeni i čekaju tvoju proveru",
  "not-needed":"nije potrebna jer u ovom pokretanju nema upozorenja",
  "not-requested":"nije pozvana u ovom pokretanju",
  "missing-key":"ključ nije podešen; osnovne provere rade",
  "scheduled-first-attempt-only":"preskočena; AI se poziva samo u prvom pokušaju dnevnog zakazanog posla",
  "daily-attempt-already-used":"današnji pokušaj je već iskorišćen; nema dodatnog AI poziva",
  "budget-check-unavailable":"preskočena jer nije potvrđeno dnevno ograničenje potrošnje",
  "incomplete-output":"usluga nije završila odgovor; predlog nije prihvaćen",
  "invalid-output":"odgovor nije prošao proveru formata; predlog nije prihvaćen",
  "analysis-unavailable":"AI usluga trenutno nije dostupna",
}
const stepNames: Record<string,string> = {
  "Optional AI advice for scheduled findings":"AI analiza nalaza — proveri status AI usluge u izveštaju.",
  "Inspect public production pages":"Provera javnih stranica — konkretne putanje su u nalazima.",
  "Publish validated details for the admin panel":"Prenos detalja u admin — pregledati puni GitHub izveštaj; sažetak nije objavljen.",
  "Verify monitor safeguards":"Testovi nadzora nisu prošli; sajt nije automatski menjan.",
  "Install monitor dependencies without lifecycle scripts":"Priprema programa za nadzor nije uspela.",
  "Write run summary":"Pisanje sažetka provere nije uspelo.",
  "Retain sanitized reports":"Čuvanje izveštaja nije uspelo.",
}

export default function MonitorFindings({ details, run }: { details: MonitorDetails; run: MonitorRun }) {
  const report = details.report
  const findings = report?.checks.filter(check => check.level !== "info") ?? []
  return <section aria-labelledby="latest-monitor-report">
    <h2 id="latest-monitor-report">Šta je poslednja provera primetila</h2>
    <p className="admin-muted">Pokretanje od {date(run.startedAt)} · pokušaj {run.attempt}. <a href={run.url} target="_blank" rel="noopener noreferrer">Otvori celo pokretanje na GitHub-u</a></p>
    {!report ? <p role="status">{details.state === "unavailable" ? "Detalji trenutno nisu dostupni. To nije potvrda da nema problema." : "Ovo pokretanje nema objavljen detaljan izveštaj za admin. Raniji rezultati ostaju na GitHub-u; direktan prikaz počinje od prvog pokretanja posle objave ove dopune."}</p> : <>
      <p className="admin-monitor-result" data-level={report.status === "healthy" ? "info" : report.status === "critical" ? "critical" : "warning"}>
        {report.status === "healthy" ? "U obuhvaćenim proverama nisu pronađeni problemi." : `${findings.length} ${findings.length === 1 ? "nalaz zahteva" : "nalaza zahtevaju"} pregled.`}
      </p>
      <p className="admin-muted">Pregledano {report.coverage.pagesChecked} stranica; sitemap sadrži {report.coverage.songUrls.toLocaleString("sr-Latn")} pesama. Provera završena {date(report.finishedAt)}. Nije pregledana muzička tačnost svake pesme.</p>
      <div className="admin-finding-list">{findings.map(check => {
        const [title, fallback, next] = descriptions[check.code] || ["Tehnički nalaz", "Provera zahteva pregled.", "Otvori puni izveštaj."]
        const observed = check.code === "canonical" && check.reason ? ({missing:"Canonical oznaka nije pronađena u HTML-u.",multiple:`Pronađeno je ${check.observedCount} canonical oznaka; očekuje se jedna.`,mismatch:"Canonical oznaka postoji, ali ne odgovara adresi ove stranice."})[check.reason] : check.code === "heading" && check.observedCount !== undefined ? `Pronađeno je ${check.observedCount} H1 naslova; očekuje se tačno jedan.` : fallback
        const href = publicPath(report.origin + check.path, report.origin) || (/^\/(?:robots\.txt|sitemap\.xml|sitemaps\/(?:pages|songs-\d+|artists-\d+)\.xml)$/.test(check.path) ? check.path : null)
        const advice = report.ai.analysis?.findings.find(item => item.checkId === check.id)
        return <article key={check.id} className="admin-finding" data-level={check.level}>
          <div className="admin-finding-heading"><h3>{title}</h3><span className="admin-finding-badge">{labels[check.level]}</span></div>
          <dl><dt>Gde</dt><dd><code>{decodeURIComponent(check.path)}</code>{href && <a className="admin-finding-link" href={href} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />Otvori stranicu</a>}</dd><dt>Šta je primećeno</dt><dd>{observed}{check.httpStatus !== undefined && <p>{check.httpStatus === 0 ? "HTTP odgovor nije dobijen u dozvoljenom vremenu." : `Zabeležen je HTTP ${check.httpStatus}.`}</p>}</dd><dt>Sledeći korak</dt><dd>{next}</dd></dl>
          {advice && <div className="admin-finding-advice"><strong>AI predlog — nije primenjen</strong><p>{advice.explanation}</p><p>{advice.recommendation}</p></div>}
          <p className="admin-muted">Ovaj nalaz nije automatski izmenio sadržaj. Tehnička oznaka: {check.code}.</p>
        </article>
      })}</div>
      {report.omittedChecks > 0 && <p role="status">Još {report.omittedChecks} nalaza je u punom GitHub izveštaju. Prikaz iznad nije ceo spisak.</p>}
      <p className="admin-muted">AI analiza: {report.ai.status === "provider-error" ? `usluga je odbila zahtev${report.ai.httpStatus ? ` (HTTP ${report.ai.httpStatus})` : ""}` : aiStates[report.ai.status] || "nije završena ili je preskočena"}. {report.ai.httpStatus === 429 && "Proveriti API kredite, kvotu i ograničenja zahteva; ovaj status ne potvrđuje pojedinačan uzrok."}</p>
    </>}
    {details.failedSteps.length > 0 && <div className="admin-finding-advice"><strong>Koraci koji nisu prošli</strong><ul>{details.failedSteps.map(step => <li key={step}>{stepNames[step] || step}</li>)}</ul></div>}
  </section>
}
