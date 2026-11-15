import type { EngagementReport } from "@/lib/engagement/model"
import { returnRate } from "@/lib/engagement/model"
import styles from "./summary.module.css"

export default function EngagementSummary({ report: r }: { report: EngagementReport }) {
  const num = (n: number) => n.toLocaleString("sr-Latn"), date = (v: string) => new Intl.DateTimeFormat("sr-Latn", { timeZone: "UTC", dateStyle: "short" }).format(new Date(v))
  const rate = returnRate(r.cohort)
  const firstUtcDay = new Date(r.startedAt).toISOString().slice(0, 10)
  return <div className={styles.summary}>
    <p>Merenje dostupno od {date(r.startedAt)}. Uključilo ga je <strong>{num(r.optedIn)} od {num(r.eligible)}</strong> korisničkih naloga. Ovo je dobrovoljan uzorak, ne ukupan saobraćaj sajta. Gosti i administratori nisu uključeni u metrike aktivnosti.</p>
    <div className="admin-stats">
      <div><strong>{num(r.seven.active)}</strong>Aktivni za 7 dana<small>Različiti nalozi, uključujući danas</small></div>
      <div><strong>{num(r.thirty.active)}</strong>Aktivni za 30 dana<small>Različiti nalozi, uključujući danas</small></div>
      <div><strong>{num(r.seven.repeat)}</strong>Ponovljena aktivnost<small>Aktivni najmanje dva različita dana tokom poslednjih 7 dana</small></div>
      <div><strong>{rate === null ? "Još nema uzorka" : rate + "%"}</strong>Povratak naredne nedelje<small>{rate === null ? "Potrebno je najmanje 5 naloga sa završenim periodom posmatranja." : num(r.cohort.returned) + " od " + num(r.cohort.eligible) + " naloga"}</small></div>
    </div>
    <p className="admin-muted">Povratak znači aktivnost od 7. do 13. dana nakon prve zabeležene aktivnosti. Posmatramo poslednjih 28 potpuno sazrelih početnih dana; prvi rezultati mogu nastati posle 14 dana. To nisu nužno novoregistrovani korisnici.</p>
    <div className={styles.table}><table><caption>Stvarno korišćenje funkcija — broj različitih naloga</caption><thead><tr><th scope="col">Radnja</th><th scope="col">7 dana</th><th scope="col">30 dana</th></tr></thead><tbody>
      <tr><th scope="row">Pesma iz plejliste ili sviranje plejliste</th><td>{num(r.seven.playlist)}</td><td>{num(r.thirty.playlist)}</td></tr>
      <tr><th scope="row">Režim sviranja plejliste</th><td>{num(r.seven.performance)}</td><td>{num(r.thirty.performance)}</td></tr>
      <tr><th scope="row">Pokrenuta muzika u YouTube plejeru</th><td>{num(r.seven.music)}</td><td>{num(r.thirty.music)}</td></tr>
    </tbody></table></div>
    <p className="admin-muted">Jedan nalog se u svakoj kategoriji broji jednom u periodu, bez obzira na broj uređaja i pesama. Pokretanje muzike potvrđuje stanje reprodukcije plejera; ne dokazuje slušanje cele pesme. Grupe se preklapaju i ne sabiraju se.</p>
    <div className={styles.table}><table><caption>Aktivnost po UTC danima — poslednjih 14 dana</caption><thead><tr><th scope="col">Datum</th><th scope="col">Aktivni</th><th scope="col">Plejliste</th><th scope="col">Muzika</th></tr></thead><tbody>{r.days.map(day => <tr key={day.day}><th scope="row">{date(day.day)}</th><td>{day.day.slice(0,10) < firstUtcDay ? "—" : num(day.active)}</td><td>{day.day.slice(0,10) < firstUtcDay ? "—" : num(day.playlist)}</td><td>{day.day.slice(0,10) < firstUtcDay ? "—" : num(day.music)}</td></tr>)}</tbody></table></div>
    <h2>Rast sadržaja naloga tokom poslednjih 30 dana</h2>
    <p>Novi korisnički nalozi: <strong>{num(r.inventory.registrations)}</strong> · Napravljene plejliste: <strong>{num(r.inventory.playlists)}</strong> · Napravljene muzičke liste: <strong>{num(r.inventory.musicLists)}</strong></p>
    <p className="admin-muted">Ovi zbirni brojevi koriste postojeće zapise svih korisničkih naloga, bez administratora i blokiranih naloga. Liste koje su u međuvremenu obrisane nisu uključene; ovo nije istorija svih kreiranja niti mera slušanja.</p>
    <p className="admin-muted">Obračun: {new Date(r.calculatedAt).toLocaleString("sr-Latn", { timeZone: "Europe/Belgrade" })}. Pregled se kešira 60 sekundi. Dnevni podaci koriste se za poslednjih 90 kalendarskih dana, a stariji se brišu pri sledećem merenju ili pregledu; isključivanje merenja uklanja podatke tog naloga. Ranija istorija nije naknadno rekonstruisana.</p>
  </div>
}
