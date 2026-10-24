"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import SongSheet from "./SongSheet"
import { parseSongSheet } from "@/lib/chords/songSheet"
import { submissionCategories, submissionExample, validateSubmission, type SubmissionInput } from "@/lib/submissions/validation"

type Props = { reviewId?: string; initial?: SubmissionInput }
const empty: SubmissionInput = { category: "", artistName: "", title: "", lyrics: "" }
const field = "block w-full min-w-0 rounded border border-gray-600 bg-black/30 px-3 py-3 text-base text-white focus:border-sky-400 focus:outline-none"

export default function SongSubmissionForm({ reviewId, initial }: Props) {
  const router = useRouter()
  const [values, setValues] = useState(initial ?? empty)
  const [note, setNote] = useState("")
  const [accepted, setAccepted] = useState(Boolean(reviewId))
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ href: string | null } | null>(null)
  const lines = useMemo(() => preview ? parseSongSheet(values.lyrics) : [], [preview, values.lyrics])
  function change(key: keyof SubmissionInput, value: string) { setValues(current => ({ ...current, [key]: value })) }

  async function send(action: "submit" | "approve" | "reject") {
    if (busy) return
    setError("")
    try {
      if (action !== "reject") validateSubmission(values)
      if (!accepted) throw new Error("Potvrdi da si procitao pravila.")
      if (action === "reject" && !note.trim()) throw new Error("Napisi razlog odbijanja.")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Proveri podatke."); return }
    setBusy(true)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(reviewId ? `/api/admin/song-submissions/${encodeURIComponent(reviewId)}` : "/api/song-submissions", {
        method: reviewId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        signal: controller.signal, body: JSON.stringify({ ...values, ...(reviewId ? { action, reviewNote: note } : {}) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Slanje nije uspelo.")
      setSuccess({ href: data.href ?? null })
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error && cause.name === "AbortError"
        ? "Zahtev traje predugo. Proveri listu predloga pre ponovnog slanja."
        : cause instanceof Error ? cause.message : "Slanje nije uspelo. Pokusaj ponovo.")
    } finally { window.clearTimeout(timer); setBusy(false) }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send(reviewId ? "approve" : "submit") }

  if (success) return <div role="status" className="space-y-4 border-l-2 border-green-500 py-4 pl-4">
    <p>{reviewId ? "Odluka je sacuvana." : "Predlog je poslat. Pesma ce biti objavljena tek nakon odobrenja administratora."}</p>
    {success.href && <Link href={success.href} className="inline-block text-sky-400 underline">Otvori objavljenu pesmu</Link>}
    <Link href={reviewId ? "/admin/predlozi" : "/moji-predlozi"} className="block text-sky-400 underline">{reviewId ? "Svi predlozi" : "Moji predlozi"}</Link>
  </div>

  return <form onSubmit={submit} className="min-w-0 space-y-6">
    <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-60">
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <label className="block space-y-2"><span>Kategorija</span>
          <select required value={values.category} onChange={event => change("category", event.target.value)} className={field}>
            <option value="">Izaberi kategoriju</option>
            {submissionCategories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block space-y-2"><span>Izvodjac / grupa</span><input required maxLength={200} value={values.artistName} onChange={event => change("artistName", event.target.value)} className={field} autoComplete="off" /></label>
      </div>
      <label className="block space-y-2"><span>Naziv pesme</span><input required maxLength={200} value={values.title} onChange={event => change("title", event.target.value)} className={field} autoComplete="off" /></label>

      <details className="border-y border-gray-700 py-4" open={!reviewId}>
        <summary className="cursor-pointer font-semibold">Pravila i primer unosa</summary>
        <ul id="submission-rules" className="my-4 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-300">
          <li>Izaberi kategoriju, upisi tacan naziv izvodjaca ili grupe i naziv pesme.</li>
          <li>Akorde pisi u posebnom redu iznad odgovarajuceg stiha. Razmacima ih postavi iznad reci na kojoj se menjaju; ne koristi crtice i tackice za poravnanje.</li>
          <li>Strofe i refren odvoji praznim redom. Oznake poput [Strofa 1] i [Refren] stavi u zaseban red.</li>
          <li>Koristi oznake poput C, Am, F#, Bb, E7/B ili E(#9). Ne ubacuj reklame, linkove, HTML ili dupliran tekst.</li>
          <li>Salji samo sadrzaj za koji imas pravo da ga podelis. Proveri da pesma vec nije na sajtu.</li>
          <li>Najvise 5 predloga za 24 sata. Administrator pregleda i po potrebi ispravlja svaki predlog pre objave.</li>
        </ul>
        <pre className="max-w-full overflow-x-auto bg-black/30 p-3 font-mono text-sm text-gray-200">{submissionExample}</pre>
      </details>

      <label className="block min-w-0 space-y-2"><span>Tekst sa akordima</span>
        <textarea required maxLength={40000} rows={18} wrap="off" spellCheck={false} autoCapitalize="off" autoCorrect="off"
          aria-describedby="submission-rules submission-length" value={values.lyrics} onChange={event => change("lyrics", event.target.value)}
          className={field + " resize-y overflow-x-auto font-mono leading-7"} style={{ tabSize: 4, letterSpacing: 0 }} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span id="submission-length" className="text-sm text-gray-400">{values.lyrics.length.toLocaleString("sr-Latn")} / 40.000 znakova</span>
        <button type="button" aria-expanded={preview} aria-controls="submission-preview" onClick={() => setPreview(value => !value)} className="min-h-11 rounded border border-gray-600 px-4">{preview ? "Sakrij pregled" : "Pregled rasporeda"}</button>
      </div>
      {preview && <section id="submission-preview" aria-label="Pregled pesme" className="min-w-0 border-y border-gray-700 py-6">
        <h2 className="mb-2 break-words text-xl font-semibold">{values.title || "Naziv pesme"}</h2>
        <p className="mb-6 break-words text-gray-400">{values.artistName || "Izvodjac / grupa"}</p>
        <SongSheet lines={lines} transpose={0} textSize={16} chordSize={16} />
      </section>}
      {reviewId ? <label className="block space-y-2"><span>Napomena korisniku (obavezna za odbijanje)</span>
        <textarea rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} className={field} />
      </label> : <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-sky-500" />
        <span>Procitao sam pravila, proverio raspored akorda i imam pravo da podelim ovaj sadrzaj.</span>
      </label>}
      {error && <p role="alert" className="break-words text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="min-h-11 rounded bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-500">{busy ? "Cuvam..." : reviewId ? "Odobri i objavi" : "Posalji na odobrenje"}</button>
        {reviewId && <button type="button" onClick={() => void send("reject")} className="min-h-11 rounded border border-red-400 px-5 py-3 text-red-300">Odbij predlog</button>}
      </div>
    </fieldset>
  </form>
}
