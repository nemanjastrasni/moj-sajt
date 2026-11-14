import Link from "next/link"
import { CheckCircle2, ExternalLink, Pencil } from "lucide-react"
import { reviewKinds, type ReviewedFinding, type ReviewKind } from "@/lib/monitoring/catalog-review"
import { decisionMatches, findingStatus, type FindingDecision } from "@/lib/monitoring/finding-status"
import FindingActions from "./FindingActions"

type Review = { checkedAt:string; songCheckedAt:string; summary:{ artists:number;biographies:number;discographies:number;photos:number;songs:number;songsNeedingTechnicalReview:number }; findings:ReviewedFinding[] }
type Selection = {kind:ReviewKind;page:number;status?:"otvoreni"|"reseni"|"svi"}
type CurrentSummary = {artists:number;biographies:number;discographies:number;photos:number;checkedAt:string}
const date=(value:string)=>new Intl.DateTimeFormat("sr-Latn",{dateStyle:"short",timeStyle:"short",timeZone:"Europe/Belgrade"}).format(new Date(value))
const href=(kind:ReviewKind,status:string,page=1)=>`/admin/nadzor?oblast=${kind}&stanje=${status}&strana=${page}#content-findings`
const PAGE_SIZE=12
export default function CatalogFindings({review,selection,decisions={},currentSummary}:{review:Review;selection:Selection;decisions?:Record<string,FindingDecision>;currentSummary?:CurrentSummary}) {
  const rows=review.findings.map(item=>({...item,status:findingStatus(item,decisions[item.id])})),status=selection.status??"otvoreni"
  const inState=rows.filter(item=>status==="svi"||status==="otvoreni"&&item.status==="open"||status==="reseni"&&item.status!=="open")
  const filtered=inState.filter(row=>selection.kind==="sve"||row.kind===selection.kind)
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),page=Math.min(selection.page,pages),items=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  const s=currentSummary??review.summary
  return <section id="content-findings" aria-labelledby="catalog-findings-heading">
    <h2 id="catalog-findings-heading">Biografije, diskografije, slike i akordi — konkretni nalazi</h2>
    <p className="admin-muted">Prvobitni pregled: {date(review.checkedAt)}. Pesme tehnički proverene: {date(review.songCheckedAt)}. Trenutno stanje izabranih zapisa proverava se ponovo; ručno čuvanje odmah poništava keš ovog pregleda.</p>
    <div className="admin-review-summary"><p><strong>{s.biographies} / {s.artists}</strong> upisanih biografija</p><p><strong>{s.discographies} / {s.artists}</strong> diskografija</p><p><strong>{s.photos} / {s.artists}</strong> povezanih fotografija</p><p><strong>{review.summary.songsNeedingTechnicalReview} / {review.summary.songs}</strong> pesama sa tehničkim upozorenjem u prvobitnom pregledu</p></div>
    <p className="admin-muted">{currentSummary?`Popunjenost proverena: ${date(currentSummary.checkedAt)}.`:"Trenutna popunjenost nije dostupna; brojevi iznad potiču iz prvobitnog pregleda."} Popunjeno polje rešava nalaz da podatak nedostaje; tačnost teksta ili akorda i dalje zahteva proveru. Promenjen sadržaj ne preuzima staru odluku administratora.</p>
    <nav className="admin-review-filters" aria-label="Stanje nalaza">{([["otvoreni","Otvoreni",rows.filter(row=>row.status==="open").length],["reseni","Završeni / rešeni",rows.filter(row=>row.status!=="open").length],["svi","Svi",rows.length]] as const).map(([value,label,count])=><Link key={value} href={href(selection.kind,value)} prefetch={false} aria-current={status===value?"page":undefined}>{label} ({count})</Link>)}</nav>
    <nav className="admin-review-filters" aria-label="Oblasti nalaza">{Object.entries(reviewKinds).map(([kind,label])=><Link key={kind} href={href(kind as ReviewKind,status)} prefetch={false} aria-current={kind===selection.kind?"page":undefined}>{label} ({kind==="sve"?inState.length:inState.filter(row=>row.kind===kind).length})</Link>)}</nav>
    <p className="admin-muted">Prikaz {items.length ? (page-1)*PAGE_SIZE+1 : 0}–{Math.min(page*PAGE_SIZE,filtered.length)} od {filtered.length} nalaza.</p>
    {!items.length&&<p role="status">Nema nalaza u ovom prikazu.</p>}
    <div className="admin-finding-list">{items.map(item=>{
      const closed=item.status!=="open",automatic=item.state==="resolved",decision=decisions[item.id]
      const title=closed?(automatic?({bio:"Biografija je popunjena",discography:"Diskografija je popunjena",image:"Fotografija je dodata",song:"Nalaz je završen"} as const)[item.field]:item.status==="removed"?"Zapis je uklonjen":item.status==="dismissed"?"Nalaz je odbačen":"Nalaz je označen kao rešen"):item.title
      const trace=<><p><strong>Prvobitni nalaz:</strong> {item.title}</p><p>{item.observed}</p><p>{item.next}</p><p className="admin-muted">Oznaka: {item.id}. Kontrolni zbir čuva vezu sa pregledanim zapisom.</p>{item.sourceNote&&<p className="admin-muted">Napomena o izvoru: {item.sourceNote}</p>}</>
      return <article key={item.id} className="admin-finding" data-finding-status={item.status} data-level={closed?"info":item.confidence==="confirmed-mismatch"||item.confidence==="technical-error"?"critical":"warning"}>
        <div className="admin-finding-heading"><h3>{item.name} — {title}</h3><span className="admin-finding-badge">{reviewKinds[item.kind]}</span></div>
        {closed&&<p className="admin-finding-advice"><CheckCircle2 size={18} aria-hidden="true" /> {automatic?"Rešeno: polje je sada popunjeno. Ovo nije automatska potvrda tačnosti sadržaja.":item.status==="removed"?"Stari nalaz se više ne primenjuje na ovaj zapis.":"Odluka administratora važi za trenutno pregledanu verziju sadržaja."}</p>}
        {decision&&<p className="admin-muted">Tvoja odluka: {({resolve:"označeno kao rešeno",dismiss:"nalaz odbačen",reopen:"ponovo otvoreno"} as Record<string,string>)[typeof decision==="string"?decision:decision.operation]}. {decisionMatches(item,decision)?"Odnosi se na trenutno stanje.":"Sadržaj je naknadno menjan ili nije potvrđen; prethodna odluka je sačuvana u istoriji."}</p>}
        {!closed&&item.state==="changed"&&<p className="admin-finding-advice">Zapis je izmenjen posle prvobitnog pregleda. Proveri ispravku, pa označi nalaz kao rešen ili ga odbaci. Stari predlog ne može automatski prepisati noviji sadržaj.</p>}
        {item.state==="unavailable"&&<p className="admin-finding-advice">Trenutno stanje baze nije potvrđeno. Akcije su privremeno isključene.</p>}
        <div className="admin-row-actions">{item.href&&<Link className="admin-finding-link" href={item.href} prefetch={false} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />Otvori pogođenu stranicu</Link>}{item.editHref&&<Link className="admin-finding-link" href={item.editHref} prefetch={false}><Pencil aria-hidden="true" />Pregledaj u editoru</Link>}</div>
        {closed?<details><summary>Raniji nalaz i tehnički trag</summary>{trace}</details>:trace}
        <FindingActions findingId={item.id} subjectId={item.subjectId} currentVersion={item.currentVersion} field={item.subject==="artist"&&(item.field==="bio"||item.field==="discography")?item.field:undefined} canClear={item.field==="bio"&&item.confidence==="confirmed-mismatch"&&item.state==="unchanged"} canDecide={Boolean(item.currentVersion)} disabled={item.state!=="unchanged"}/>
      </article>
    })}</div>
    <nav className="admin-review-filters" aria-label="Stranice nalaza">{page>1&&<Link href={href(selection.kind,status,page-1)} prefetch={false}>Prethodna</Link>}<span>Strana {page} / {pages}</span>{page<pages&&<Link href={href(selection.kind,status,page+1)} prefetch={false}>Sledeća</Link>}</nav>
  </section>
}
