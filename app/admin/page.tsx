import Link from "next/link"
import { ArrowRight, Flag, Music2, Plus, RefreshCw, Users } from "lucide-react"
import { readAdminStatistics } from "@/lib/adminStats/server"
import { refreshAdminStatistics } from "./actions"

export const dynamic = "force-dynamic"
export default async function AdminHome() {
  const stats = await readAdminStatistics()
  const number = (value: number) => value.toLocaleString("sr-Latn")
  const calculatedAt = new Intl.DateTimeFormat("sr-Latn", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Belgrade" }).format(new Date(stats.calculatedAt))
  return <section className="admin-page">
    <div className="admin-heading"><h1>Pregled</h1><div className="admin-row-actions"><form action={refreshAdminStatistics}><button type="submit" className="ui-button"><RefreshCw aria-hidden="true" />Osveži statistiku</button></form><Link href="/admin/songs/new" className="ui-button ui-button-primary"><Plus aria-hidden="true" />Nova pesma</Link></div></div>
    <div className="admin-stats" aria-label="Statistika sadržaja">
      <Link href="/admin/songs"><strong>{number(stats.songs)}</strong>Pesme ukupno</Link>
      <div><strong>{number(stats.textOnly)}</strong>Samo tekst<small>Bez prepoznatih akorda ili tablature</small></div>
      <div><strong>{number(stats.biographies)}</strong>Biografije<small>Izvođači sa unetom biografijom</small></div>
      <div><strong>{number(stats.discographies)}</strong>Diskografije<small>Izvođači sa najmanje jednim albumom</small></div>
      <Link href="/admin/artists"><strong>{number(stats.artists)}</strong>Izvođači</Link>
      <Link href="/admin/korisnici"><strong>{number(stats.users)}</strong>Korisnici</Link>
    </div>
    <p className="admin-muted admin-stat-details">Sa prepoznatim akordima: <strong>{number(stats.withChords)}</strong> · Samo tablatura ili bas zapis: <strong>{number(stats.notationOnly)}</strong> · Prazni zapisi: <strong>{number(stats.empty)}</strong></p>
    <p className="admin-muted admin-stat-time">Poslednji obračun: <time dateTime={stats.calculatedAt}>{calculatedAt}</time>. Podaci mogu kasniti nekoliko minuta. Za aktuelno stanje izaberi „Osveži statistiku“.</p>
    <nav className="admin-tasks" aria-label="Admin zadaci">
      <Link href="/admin/prijave"><Flag aria-hidden="true" /><span>Prijave grešaka</span><small>Pregled i obrada</small><ArrowRight aria-hidden="true" /></Link>
      <Link href="/admin/predlozi"><Music2 aria-hidden="true" /><span>Predlozi pesama</span><small>Pregled i odobravanje</small><ArrowRight aria-hidden="true" /></Link>
      <Link href="/admin/korisnici"><Users aria-hidden="true" /><span>Korisnici i prisustvo</span><small>Nalozi i dozvole</small><ArrowRight aria-hidden="true" /></Link>
    </nav>
  </section>
}
