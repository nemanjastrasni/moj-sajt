"use client"
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { capoSheet, capoSource, isCapo } from "@/lib/chords/capoDisplay"
import { createCapoRecommendations, sameCapoScope, type RecommendationView } from "@/lib/chords/capoRecommendations"
import type { SheetLine } from "@/lib/chords/songSheet"
export default function useSongCapo(songId: string, lines: SheetLine[], transpose: number, initial?: { id: string; fret: number }, controlled?: { value: number | null; change: (value: number | null) => void }) {
  const [selection, setSelection] = useState<{ id: string; lines: SheetLine[]; fret: number | null }>(() => ({ id: songId, lines, fret: initial?.id === songId && isCapo(initial.fret) ? initial.fret : null }))
  const selected = controlled ? controlled.value : selection.id === songId && selection.lines === lines ? selection.fret : initial?.id === songId && isCapo(initial.fret) ? initial.fret : null
  const source = useMemo(() => capoSource(lines), [lines])
  const [view, setView] = useState<RecommendationView>({ scope: null, phase: "idle", options: [] })
  const [engine] = useState(() => createCapoRecommendations(setView))
  const scope = { id: songId, lines, transpose, source }
  const runtime = useRef({ songId, lines, transpose, selected, controlled })
  useLayoutEffect(() => { runtime.current = { songId, lines, transpose, selected, controlled } }, [songId, lines, transpose, selected, controlled])
  // Cancel before a changed song/key can receive a pending recommendation.
  useLayoutEffect(() => () => engine.release(), [songId, lines, transpose, source, engine])
  const select = useCallback((fret: number | null) => {
    if (fret !== null && !isCapo(fret)) return
    const current = runtime.current
    if (current.controlled) current.controlled.change(fret)
    else setSelection({ id: current.songId, lines: current.lines, fret })
  }, [])
  const prepare = useCallback(async (applyRecommendation = false) => {
    const scope = { id: songId, lines, transpose, source }, options = await engine.read(scope), current = runtime.current
    if (engine.scope && sameCapoScope(engine.scope, scope) && current.songId === songId && current.lines === lines && current.transpose === transpose && applyRecommendation && current.selected === null && options[0]) select(options[0].fret)
    return options
  }, [songId, lines, transpose, source, engine, select])
  const release = useCallback(() => engine.release(), [engine])
  const display = useMemo(() => capoSheet(lines, transpose, selected, source), [lines, transpose, selected, source])
  const current = sameCapoScope(view.scope, scope) ? view : { phase: "idle" as const, options: [] }
  return { ...display, source, options: current.options, recommendationPhase: current.phase, selected, select, prepare, release }
}
export type SongCapo = ReturnType<typeof useSongCapo>
