import Link from "next/link"
import { submissionCategories } from "@/lib/submissions/validation"

type Item = {
  id: string; title: string; artistName: string; category: string; status: string;
  createdAt: Date; reviewNote: string | null;
  publishedSong: { slug: string; artist: { slug: string; category: string | null } } | null;
}
export const submissionStatus: Record<string, string> = { pending: "Na cekanju", approved: "Odobreno", rejected: "Odbijeno" }
export default function SongSubmissionList({ items, admin = false }: { items: Item[]; admin?: boolean }) {
  if (!items.length) return <p className="py-8 text-gray-400">{admin ? "Nema predloga u ovom pregledu." : "Jos nisi poslao nijedan predlog."}</p>
  return <ul className="divide-y divide-gray-700">
    {items.map(item => <li key={item.id} className="space-y-3 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{item.title}</h2><p className="break-words text-gray-300">{item.artistName}</p></div>
        <span className={item.status === "approved" ? "text-green-400" : item.status === "rejected" ? "text-red-300" : "text-amber-300"}>{submissionStatus[item.status] ?? item.status}</span>
      </div>
      <p className="text-sm text-gray-400">{submissionCategories.find(category => category.value === item.category)?.label} · {item.createdAt.toLocaleDateString("sr-Latn", { timeZone: "Europe/Belgrade" })}</p>
      {item.reviewNote && <p className="whitespace-pre-wrap break-words text-sm">Napomena: {item.reviewNote}</p>}
      {admin && <Link href={`/admin/predlozi/${encodeURIComponent(item.id)}`} className="inline-block py-2 text-sky-400 underline">{item.status === "pending" ? "Pregledaj predlog" : "Detalji predloga"}</Link>}
      {item.publishedSong && <Link className="inline-block py-2 text-sky-400 underline" href={"/pesme/" + [item.publishedSong.artist.category ?? item.category, item.publishedSong.artist.slug, item.publishedSong.slug].map(encodeURIComponent).join("/")}>Otvori pesmu</Link>}
    </li>)}
  </ul>
}
