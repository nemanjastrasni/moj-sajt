"use client"

import { useMemo, useState } from "react"
import { capoSheet, capoSource, isCapo, rankCapos } from "@/lib/chords/capo"
import type { SheetLine } from "@/lib/chords/songSheet"

export default function useSongCapo(songId: string, lines: SheetLine[], transpose: number, initial?: { id: string; fret: number }, controlled?: { value: number | null; change: (value: number | null) => void }) {
  const [selection, setSelection] = useState<{ id: string; lines: SheetLine[]; fret: number | null }>(() => ({ id: songId, lines, fret: initial?.id === songId && isCapo(initial.fret) ? initial.fret : null }))
  const selected = controlled ? controlled.value : selection.id === songId && selection.lines === lines ? selection.fret : initial?.id === songId && isCapo(initial.fret) ? initial.fret : null
  const source = useMemo(() => capoSource(lines), [lines])
  const options = useMemo(() => rankCapos(lines, transpose, source), [lines, transpose, source])
  const display = useMemo(() => capoSheet(lines, transpose, selected, source), [lines, transpose, selected, source])
  return { ...display, source, options, selected, select: (fret: number | null) => { if (fret === null || isCapo(fret)) { if (controlled) controlled.change(fret); else setSelection({ id: songId, lines, fret }) } } }
}
export type SongCapo = ReturnType<typeof useSongCapo>
