import Link from "next/link"
import { ExternalLink, Pencil } from "lucide-react"
import { reviewKinds, type ReviewedFinding, type ReviewKind } from "@/lib/monitoring/catalog-review"
import FindingActions from "./FindingActions"

type Review = { checkedAt:string; songCheckedAt:string; summary:{ artists:number;biographies:number;discographies:number;photos:number;songs:number;songsNeedingTechnicalReview:number }; findings:ReviewedFinding[] }
const date=(value:string)=>new Intl.DateTimeFormat("sr-Latn",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Belgrade"}).format(new Date(value))
const href=(kind:ReviewKind,page=1)=>`/admin/nadzor?oblast=${kind}&strana=${page}#content-findings`
const PAGE_SIZE=12
export default function CatalogFindings({review,selection,decisions={}}:{review:Review;selection:{kind:ReviewKind;page:number};decisions?:Record<string,string>}) {
  const filtered=review.findings.filter(row=>selection.kind==="sve"||row.kind===selection.kind)
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),page=Math.min(selection.page,pages),items=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  const s=review.summary
  return <section id="content-findings" aria-labelledby="catalog-findings-heading">
    <h2 id="catalog-findings-heading">Biografije, diskografije, slike i akordi — konkretni nalazi</h2>
    <p className="admin-muted">Pregled sadržaja: {date(review.checkedAt)}. Pesme tehnički proverene: {date(review.songCheckedAt)}. Ovo su nalazi pregleda sadržaja, odvojeni od svakodnevne provere dostupnosti sajta.</p>
    <div className="admin-review-summary"><p><strong>{s.biographies} / {s.artists}</strong> upisanih biografija</p><p><strong>{s.discographies} / {s.artists}</strong> diskografija</p><p><strong>{s.photos} / {s.artists}</strong> povezanih fotografija</p><p><strong>{s.songsNeedingTechnicalReview} / {s.songs}</strong> pesama sa tehničkim upozorenjem</p></div>
    <p className="admin-muted">Broj upisanih tekstova nije potvrda njihove tačnosti. Tehničko upozorenje nije dokaz pogrešnog akorda. Prikazan je odabrani red za dalji rad; nisu svih {s.songsNeedingTechnicalReview} pesama pojedinačno pregledane slušanjem. Stanje izabranih zapisa ponovo se proverava pri učitavanju, uz keš do pet minuta.</p>
    <nav className="admin-review-filters" aria-label="Oblasti nalaza">{Object.entries(reviewKinds).map(([kind,label])=><Link key={kind} href={href(kind as ReviewKind)} prefetch={false} aria-current={kind===selection.kind?"page":undefined}>{label} ({kind==="sve"?review.findings.length:review.findings.filter(row=>row.kind===kind).length})</Link>)}</nav>
    <p className="admin-muted">Prikaz {items.length ? (page-1)*PAGE_SIZE+1 : 0}–{Math.min(page*PAGE_SIZE,filtered.length)} od {filtered.length} nalaza u ovoj oblasti.</p>
    <div className="admin-finding-list">{items.map(item=><article key={item.id} className="admin-finding" data-level={item.confidence==="confirmed-mismatch"||item.confidence==="technical-error"?"critical":"warning"}>
      <div className="admin-finding-heading"><h3>{item.name} — {item.title}</h3><span className="admin-finding-badge">{reviewKinds[item.kind]}</span></div>
      {decisions[item.id]&&<p className="admin-finding-advice">Tvoja odluka o nalazu: {({resolve:"označeno kao rešeno",dismiss:"nalaz odbačen",reopen:"ponovo otvoren"} as Record<string,string>)[decisions[item.id]]}. {item.state!=="unchanged"?"Sadržaj je naknadno menjan ili nije potvrđen; ova odluka se odnosi na raniji nalaz.":"Odluka je evidentirana odvojeno od izmena sadržaja."}</p>}
      {item.state!=="unchanged"&&<p className="admin-finding-advice">{item.state==="changed"?"Zapis je menjan posle ovog pregleda. Nalaz ispod je istorijski i zahteva novu proveru; ne pretpostavljamo da je problem i dalje prisutan ili rešen.":item.state==="removed"?"Zapis više nije pronađen. Stari nalaz ne treba primenjivati na drugi profil.":"Trenutno stanje baze nije potvrđeno. Prikazan je ranije zabeležen nalaz; veze su privremeno isključene."}</p>}
      <dl><dt>Gde</dt><dd><code>{item.href || item.publicHref || (item.slug&&item.category?`/biografija/${encodeURIComponent(item.category)}/${encodeURIComponent(item.slug)}`:"Zapis nije trenutno dostupan.")}</code></dd><dt>Šta je primećeno</dt><dd>{item.observed}</dd><dt>Pouzdanost nalaza</dt><dd>{item.confidence==="confirmed-mismatch"?"Potvrđeno: tema postojećeg teksta ne odgovara profilu. Izvor za zamenu još treba proveriti.":item.confidence==="technical-error"?"Potvrđen tehnički problem u zapisu; muzički sadržaj nije automatski procenjen.":item.confidence==="technical-warning"?"Automatsko upozorenje — potrebna ručna provera.":"Podatak nedostaje; nije zaključeno da ne postoji pouzdan izvor."}</dd><dt>Sledeći korak</dt><dd>{item.next}</dd><dt>Odobrenje</dt><dd>{item.requiresApproval?"Čeka tvoju odluku. Nalaz nije automatski promenio zapis.":"Pouzdane dopune praznih polja mogu se pripremiti u okviru odobrenog rada."}</dd></dl>
      <div className="admin-row-actions">{item.href&&<Link className="admin-finding-link" href={item.href} prefetch={false} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />Otvori pogođenu stranicu</Link>}{item.editHref&&<Link className="admin-finding-link" href={item.editHref} prefetch={false}><Pencil aria-hidden="true" />Pregledaj u editoru</Link>}</div>
      <details><summary>Tehnički trag nalaza</summary><p className="admin-muted">Oznaka: {item.id}. Stanje pri pregledu sačuvano je kontrolnim zbirom; ovde se ne prikazuju puni tekstovi pesama ili podaci naloga.</p>{item.sourceNote&&<p className="admin-muted">Napomena o izvoru: {item.sourceNote}</p>}</details>
      <FindingActions findingId={item.id} subjectId={item.subjectId} field={item.subject==="artist"&&(item.field==="bio"||item.field==="discography")?item.field:undefined} canClear={item.field==="bio"&&item.confidence==="confirmed-mismatch"} canDecide disabled={item.state!=="unchanged"}/>
    </article>)}</div>
    <nav className="admin-review-filters" aria-label="Stranice nalaza">{page>1&&<Link href={href(selection.kind,page-1)} prefetch={false}>Prethodna</Link>}<span>Strana {page} / {pages}</span>{page<pages&&<Link href={href(selection.kind,page+1)} prefetch={false}>Sledeća</Link>}</nav>
  </section>
}
