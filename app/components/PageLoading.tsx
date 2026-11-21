"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { NAVIGATION_STARTED } from "@/lib/navigation/feedback"
import GuideText from "./GuideText"
import styles from "./PageLoading.module.css"

const SHOW_AFTER_MS = 180
const RESET_AFTER_MS = 120_000

export function PageLoading({ defer = false }: { defer?: boolean }) {
  return (
    <div className={defer ? `${styles.status} ${styles.deferred}` : styles.status} role="status" aria-atomic="true" data-page-loading>
      <span className={styles.spinner} aria-hidden="true" />
      <GuideText text={{ sr: "Učitavanje stranice…", en: "Loading page…" }} />
    </div>
  )
}

export default function NavigationFeedback() {
  const pathname = usePathname()
  const search = useSearchParams()?.toString()
  const [visible, setVisible] = useState(false)
  const reveal = useRef<number | undefined>(undefined)
  const safety = useRef<number | undefined>(undefined)
  const committed = useRef("")

  const reset = useCallback(() => {
    window.clearTimeout(reveal.current)
    window.clearTimeout(safety.current)
    reveal.current = undefined
    setVisible(false)
  }, [])

  useEffect(() => {
    committed.current = pathname + (search ? `?${search}` : "")
    reset()
  }, [pathname, search, reset])

  useEffect(() => {
    function start(href: string) {
      const destination = new URL(href, window.location.href)
      const query = destination.searchParams.toString()
      const next = destination.pathname + (query ? `?${query}` : "")
      if (destination.origin !== window.location.origin || next === committed.current) {
        reset()
        return
      }
      reveal.current ??= window.setTimeout(() => setVisible(true), SHOW_AFTER_MS)
      window.clearTimeout(safety.current)
      safety.current = window.setTimeout(reset, RESET_AFTER_MS)
    }

    function onNavigation(event: Event) {
      const url = (event as CustomEvent<unknown>).detail
      if (typeof url === "string") start(url)
    }

    // The Next.js hook covers Links and router navigation. Plain same-site
    // links, such as the offline library, can also trigger a document load.
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(target instanceof HTMLAnchorElement) || target.hasAttribute("download") || (target.target && target.target !== "_self")) return
      const destination = new URL(target.href)
      if (destination.origin !== location.origin || destination.pathname.startsWith("/api/") || /\.[^/]+$/.test(destination.pathname)) return
      start(destination.href)
    }

    window.addEventListener(NAVIGATION_STARTED, onNavigation)
    window.addEventListener("click", onDocumentClick)
    window.addEventListener("pagehide", reset)
    return () => {
      window.removeEventListener(NAVIGATION_STARTED, onNavigation)
      window.removeEventListener("click", onDocumentClick)
      window.removeEventListener("pagehide", reset)
      window.clearTimeout(reveal.current)
      window.clearTimeout(safety.current)
      reveal.current = undefined
    }
  }, [reset])

  return visible ? <PageLoading /> : null
}
