"use client"

import { useEffect, useRef, useState } from "react"
import { Download, FileDown, LoaderCircle } from "lucide-react"
import { useI18n } from "./UiText"
import { normalizeTranspose } from "@/lib/songbook/model"
import { downloadPdf, pdfError, preparePdfDownload } from "@/lib/songbook/client"

type Props = { song: { id: string; title: string; artist: string; lyrics: string }; transpose: number; textSize: number; chordSize: number }
export default function SongPdfButton({ song, transpose, textSize, chordSize }: Props) {
  const { t, locale } = useI18n()
  const running = useRef(false)
  const alive = useRef(true)
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  const [file, setFile] = useState<{ url: string; filename: string; key: string } | null>(null)
  const key = JSON.stringify([song, transpose, textSize, chordSize, locale])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url) }, [file])
  async function exportSong() {
    if (running.current) return
    running.current = true; setBusy(true); setError("")
    try {
      const result = await preparePdfDownload([{ ...song, transpose: normalizeTranspose(transpose) }], {
        title: `${song.artist} - ${song.title}`, locale, book: false, contents: false,
        fontSize: Math.max(8, Math.min(24, textSize * .75)), chordSize: Math.max(8, Math.min(24, chordSize * .75)),
      })
      if (!alive.current) { URL.revokeObjectURL(result.url); return }
      setFile({ ...result, key }); downloadPdf(result)
    } catch (cause) { if (alive.current) setError(pdfError(cause)) }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  return <div className="flex min-w-0 flex-wrap items-center gap-2">
    <button type="button" disabled={busy} title={t("Preuzmi pesmu kao PDF")} aria-label={t("Preuzmi pesmu kao PDF")} onClick={() => void exportSong()} className="inline-flex min-h-11 items-center gap-2 rounded border border-gray-600 px-3 text-sm disabled:opacity-50">
      {busy ? <LoaderCircle size={18} className="animate-spin" /> : <FileDown size={18} />}PDF
    </button>
    {busy && <span role="status" className="sr-only">{t("Pripremam PDF...")}</span>}
    {file?.key === key && <a href={file.url} download={file.filename} title={t("Preuzmi PDF")} aria-label={t("Preuzmi PDF")} className="inline-flex h-11 w-11 items-center justify-center"><Download size={18} /></a>}
    {error && <p role="alert" className="max-w-sm break-words text-sm text-red-300">{t(error)}</p>}
  </div>
}
