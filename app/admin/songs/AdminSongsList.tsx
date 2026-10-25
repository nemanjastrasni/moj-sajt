import Link from "next/link"
import { Plus, Pencil, ExternalLink, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { adminLetters, adminPageNumbers, adminSongHref, type AdminSongFilters } from "@/lib/adminSongs/query"
import { submissionCategories } from "@/lib/submissions/validation"
import { getCategoryLabel } from "@/lib/categories"
import type { listAdminSongs } from "@/lib/adminSongs/server"
import DeleteSongButton from "./delete-button"
import styles from "./AdminSongs.module.css"
import SongReviewBadge from "@/app/components/SongReviewBadge"
import { isReviewStatus, reviewLabels, reviewStatuses } from "@/lib/songReview/model"

export default function AdminSongsList({ filters, result }: { filters: AdminSongFilters; result: Awaited<ReturnType<typeof listAdminSongs>> }) {
  return <div className={styles.page}>
    <div className={styles.heading}><h2>Pesme</h2><Link href="/admin/songs/new" className={`${styles.button} ${styles.primary}`}><Plus />Nova pesma</Link></div>
    <form action="/admin/songs" className={styles.filters}>
      <label>Pretraga<input name="q" defaultValue={filters.q} maxLength={120} placeholder="Naslov ili izvodjac" className={styles.input} /></label>
      <label>Izvodjac<input name="artist" defaultValue={filters.artist} maxLength={200} className={styles.input} /></label>
      <label>Slovo<select name="letter" defaultValue={filters.letter} className={styles.input}><option value="">Sva slova</option>{adminLetters.map(letter => <option key={letter}>{letter}</option>)}</select></label>
      <label>Kategorija<select name="category" defaultValue={filters.category} className={styles.input}><option value="">Sve kategorije</option>{submissionCategories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className={styles.reviewFilter}>Provera pesme<select name="review" defaultValue={filters.review} className={styles.input}><option value="">Sve oznake</option>{reviewStatuses.map(value => <option key={value} value={value}>{reviewLabels[value]}</option>)}</select></label>
      <label>Redosled<select name="sort" defaultValue={filters.sort} className={styles.input}><option value="latest">Najnovije</option><option value="title">Naslov A-Z</option><option value="artist">Izvodjac A-Z</option></select></label>
      <button className={styles.button}><Search />Primeni</button><Link className={styles.button} href="/admin/songs">Ponisti</Link>
    </form>
    <p className={styles.count}>{result.total} pesama · Stranica {result.page} / {result.totalPages}</p>
    {result.songs.length === 0 ? <p>Nema rezultata.</p> : <div className={styles.tableWrap}><table className={styles.table}>
      <thead><tr><th scope="col">Naslov</th><th scope="col">Izvodjac</th><th scope="col">Kategorija</th><th scope="col">Provera</th><th scope="col">Akcije</th></tr></thead>
      <tbody>{result.songs.map(song => <tr key={song.id}>
        <td>{song.title}</td><td>{song.artist.name}</td><td>{getCategoryLabel(song.category)}</td>
        <td><SongReviewBadge status={isReviewStatus(song.review?.status) ? song.review.status : "unreviewed"} /></td>
        <td><div className={styles.actions}>
          <Link href={`/admin/songs/${song.id}/edit`} className={styles.icon} title={`Uredi: ${song.title}`} aria-label={`Uredi: ${song.title}`}><Pencil /></Link>
          <Link href={"/pesme/" + [song.category, song.artist.slug, song.slug].map(encodeURIComponent).join("/")} className={styles.icon} title={`Otvori: ${song.title}`} aria-label={`Otvori: ${song.title}`}><ExternalLink /></Link>
          <DeleteSongButton id={song.id} title={song.title} artist={song.artist.name} />
        </div></td>
      </tr>)}</tbody>
    </table></div>}
    {result.totalPages > 1 && <nav className={styles.pagination} aria-label="Stranice pesama">
      {result.page > 1 && <Link href={adminSongHref(filters, result.page - 1)} className={styles.icon} title="Prethodna stranica" aria-label="Prethodna stranica"><ChevronLeft /></Link>}
      {adminPageNumbers(result.page, result.totalPages).map((page, i, pages) => <span key={page} className={styles.actions}>
        {i > 0 && page - pages[i - 1] > 1 && <span aria-hidden="true">...</span>}
        <Link href={adminSongHref(filters, page)} className={styles.button} aria-current={page === result.page ? "page" : undefined}>{page}</Link>
      </span>)}
      {result.page < result.totalPages && <Link href={adminSongHref(filters, result.page + 1)} className={styles.icon} title="Sledeca stranica" aria-label="Sledeca stranica"><ChevronRight /></Link>}
    </nav>}
  </div>
}
