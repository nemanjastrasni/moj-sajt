"use client"

import Link from "next/link"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { getCategoryLabel } from "@/lib/categories"
import { cleanSearchQuery, prepareSongQuery, SEARCH_MAX_LENGTH, songSearchHref, type SongSearchResult } from "@/lib/songSearch"
import { loadSongSearch, type SongSearchLoader } from "@/lib/songSearchClient"
import { useI18n } from "./UiText"

type Snapshot = { query: string; status: "idle" | "ready" | "error"; results: SongSearchResult[]; error?: string }

export default function SongSearch({ loadResults = loadSongSearch, inlinePopup = false, onNavigate }: { loadResults?: SongSearchLoader; inlinePopup?: boolean; onNavigate?: () => void }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const popupContainer = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [retry, setRetry] = useState(0)
  const [popup, setPopup] = useState({ above: false, maxHeight: 384, left: 0, top: 0, bottom: 0, width: 0 })
  const [snapshot, setSnapshot] = useState<Snapshot>({ query: "", status: "idle", results: [] })
  const key = cleanSearchQuery(query)
  const prepared = useMemo(() => {
    try { return { search: prepareSongQuery(key), error: "" } }
    catch (error) { return { search: null, error: (error as Error).message } }
  }, [key])
  const requestKey = JSON.stringify([key, retry])
  const current = snapshot.query === requestKey
  const results = prepared.search && current && snapshot.status === "ready" ? snapshot.results : []
  const expanded = open && Boolean(prepared.search || prepared.error)
  const loading = expanded && Boolean(prepared.search) && !current
  const error = prepared.error || (current && snapshot.status === "error" ? snapshot.error : "")

  useEffect(() => {
    const search = prepared.search
    if (!search) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const found = await loadResults(search.query, controller.signal)
        if (!controller.signal.aborted) setSnapshot({ query: requestKey, status: "ready", results: found })
      } catch (error) {
        if (!controller.signal.aborted) {
          setSnapshot({ query: requestKey, status: "error", results: [], error: error instanceof Error ? error.message : "Pretraga nije uspela. Pokusaj ponovo." })
        }
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [prepared.search, requestKey, loadResults])

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target) && !popupContainer.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [])

  useEffect(() => {
    if (!expanded) return
    function fitPopup() {
      const anchor = input.current?.getBoundingClientRect()
      if (!anchor) return
      const viewport = window.visualViewport
      const top = viewport?.offsetTop ?? 0
      const bottom = top + (viewport?.height ?? window.innerHeight)
      const below = bottom - anchor.bottom - 12
      const above = anchor.top - top - 12
      const flip = below < 160 && above > below
      const maxHeight = Math.max(80, Math.min(384, Math.floor(flip ? above : below)))
      const viewportLeft = viewport?.offsetLeft ?? 0
      const viewportWidth = viewport?.width ?? window.innerWidth
      const width = Math.min(anchor.width, viewportWidth - 24)
      const left = Math.max(viewportLeft + 12, Math.min(anchor.left, viewportLeft + viewportWidth - width - 12))
      const next = { above: flip, maxHeight, left, width, top: anchor.bottom + 8, bottom: window.innerHeight - anchor.top + 8 }
      setPopup(previous => Object.keys(next).every(field => previous[field as keyof typeof next] === next[field as keyof typeof next]) ? previous : next)
    }
    const frame = window.requestAnimationFrame(fitPopup)
    window.addEventListener("resize", fitPopup)
    window.addEventListener("scroll", fitPopup, true)
    window.visualViewport?.addEventListener("resize", fitPopup)
    window.visualViewport?.addEventListener("scroll", fitPopup)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", fitPopup)
      window.removeEventListener("scroll", fitPopup, true)
      window.visualViewport?.removeEventListener("resize", fitPopup)
      window.visualViewport?.removeEventListener("scroll", fitPopup)
    }
  }, [expanded])

  useEffect(() => {
    if (expanded && active >= 0) list.current?.children[active]?.scrollIntoView({ block: "nearest" })
  }, [active, expanded])

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActive(-1); return }
    if (event.key === "Tab") { setOpen(false); return }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setOpen(true)
      if (results.length) setActive(index => event.key === "ArrowDown" ? (index + 1) % results.length : (index <= 0 ? results.length - 1 : Math.min(index - 1, results.length - 1)))
    }
    if (event.key === "Enter") {
      event.preventDefault()
      if (expanded && results.length) {
        setOpen(false)
        onNavigate?.()
        router.push(songSearchHref(results[active] ?? results[0]))
      } else setOpen(true)
    }
  }

  // Native modal dialogs require results inside their own top layer, not a body portal.
  function renderPopup(content: ReactNode) { return inlinePopup ? content : createPortal(content, document.body) }

  return <div ref={container} role="search" aria-label={t("Pretraga pesama")} className="relative w-full min-w-0 max-w-md">
    <label htmlFor={`${id}-input`} className="sr-only">{t("Pesma ili izvodjac")}</label>
    <div className="relative">
      <input ref={input} id={`${id}-input`} type="search" role="combobox" autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search" maxLength={SEARCH_MAX_LENGTH} value={query}
        aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded ? `${id}-results` : undefined}
        aria-activedescendant={expanded && active >= 0 && results[active] ? `${id}-result-${active}` : undefined}
        onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={handleKey}
        placeholder={t("Pesma ili izvodjac...")} className="song-search-input min-h-12 w-full rounded-lg border border-gray-600 bg-black/40 py-3 pl-3 pr-12 text-base text-white outline-none placeholder:text-gray-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
      {query && <button type="button" aria-label={t("Obrisi pretragu")} title={t("Obrisi pretragu")} onClick={() => { setQuery(""); setActive(-1); input.current?.focus() }} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-2xl text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400">{"\u00d7"}</button>}
    </div>
    {expanded && popup.width > 0 && typeof document !== "undefined" && renderPopup(<div ref={popupContainer}
      style={{ left: popup.left, width: popup.width, ...(popup.above ? { bottom: popup.bottom } : { top: popup.top }) }}
      className="fixed z-[1000001] min-w-0 overflow-hidden rounded-lg border border-gray-600 bg-neutral-900 text-gray-100 shadow-2xl">
      {loading && <p role="status" className="px-4 py-3 text-sm text-gray-300">{t("Trazim...")}</p>}
      {error && <div role="alert" className="px-4 py-3 text-sm">
        <p className="break-words text-red-300">{t(error)}</p>
        {!prepared.error && <button type="button" onClick={() => { setActive(-1); setRetry(value => value + 1) }} className="mt-2 min-h-11 text-sky-300 hover:underline">{t("Pokusaj ponovo")}</button>}
      </div>}
      {current && snapshot.status === "ready" && !results.length && <p role="status" className="px-4 py-3 text-sm text-gray-300">{t("Nema pronadjenih pesama.")}</p>}
      <ul ref={list} id={`${id}-results`} role="listbox" aria-label={t("Pronadjene pesme")} aria-busy={loading} style={{ maxHeight: popup.maxHeight }} className="overflow-y-auto overscroll-contain">
        {results.map((song, index) => <li key={song.id} role="presentation">
          <Link href={songSearchHref(song)} prefetch={false} id={`${id}-result-${index}`} role="option" aria-selected={active === index} tabIndex={-1}
            onMouseEnter={() => setActive(index)} onPointerDown={event => { if (event.pointerType === "mouse") event.preventDefault() }} onClick={() => { setOpen(false); onNavigate?.() }}
            className={`block min-h-14 min-w-0 border-b border-white/5 px-4 py-3 last:border-b-0 ${active === index ? "bg-sky-900/50" : "hover:bg-white/10"}`}>
            <span className="block break-words text-sm font-semibold">{song.title}</span>
            <span className="mt-1 block break-words text-xs text-gray-400">{song.artist.name}{song.category ? ` / ${getCategoryLabel(song.category, locale)}` : ""}</span>
          </Link>
        </li>)}
      </ul>
      {results.length > 0 && <span role="status" className="sr-only">{t("Pronadjeno {count} pesama.", { count: results.length })}</span>}
    </div>)}
  </div>
}
