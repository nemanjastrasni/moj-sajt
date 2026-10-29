import Link from "next/link"
import { ArrowRight, Flag, Music2, Plus, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"

export const dynamic = "force-dynamic"
export default async function AdminHome() {
  await requireSongAdmin()
  const [songs,artists,users] = await Promise.all([prisma.song.count(),prisma.artist.count(),prisma.user.count()])
  return <section className="admin-page">
    <div className="admin-heading"><h1>Pregled</h1><Link href="/admin/songs/new" className="ui-button ui-button-primary"><Plus aria-hidden="true" />Nova pesma</Link></div>
    <div className="admin-stats">
      <Link href="/admin/songs"><strong>{songs.toLocaleString("sr-Latn")}</strong>Pesme</Link>
      <Link href="/admin/artists"><strong>{artists.toLocaleString("sr-Latn")}</strong>Izvođači</Link>
      <Link href="/admin/korisnici"><strong>{users.toLocaleString("sr-Latn")}</strong>Korisnici</Link>
    </div>
    <nav className="admin-tasks" aria-label="Admin zadaci">
      <Link href="/admin/prijave"><Flag aria-hidden="true" /><span>Prijave grešaka</span><small>Pregled i obrada</small><ArrowRight aria-hidden="true" /></Link>
      <Link href="/admin/predlozi"><Music2 aria-hidden="true" /><span>Predlozi pesama</span><small>Pregled i odobravanje</small><ArrowRight aria-hidden="true" /></Link>
      <Link href="/admin/korisnici"><Users aria-hidden="true" /><span>Korisnici i prisustvo</span><small>Nalozi i dozvole</small><ArrowRight aria-hidden="true" /></Link>
    </nav>
  </section>
}
