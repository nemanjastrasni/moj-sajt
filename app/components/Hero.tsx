"use client"

import Link from "next/link"
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useI18n } from "./UiText"
import SiteImage, { siteImage, type SiteImageName } from "./SiteImage"
import styles from "./Hero.module.css"

const slides = [
  { image: "heroStrane", title: "STRANE", subtitle: "Akordi i tekstovi", href: "/pesme/strane" },
  { image: "heroDomace", title: "ZABAVNE", subtitle: "Akustika i emocija", href: "/pesme/domace" },
  { image: "heroNarodne", title: "NARODNE", subtitle: "Kafana vibe", href: "/pesme/narodne" },
] satisfies { image: SiteImageName; title: string; subtitle: string; href: string }[]
const sizes = "(min-width: 1152px) 1120px, calc(100vw - 32px)"

export default function Hero() {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState([true, false, false])
  const [canRotate, setCanRotate] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(true)
  const [imageError, setImageError] = useState(false)
  const current = useRef(0)
  const ready = useRef(new Set([0]))
  const pending = useRef<HTMLImageElement | null>(null)
  const request = useRef(0)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const select = useCallback((target: number) => {
    const next = (target + slides.length) % slides.length
    const version = ++request.current
    if (pending.current) { pending.current.onload = null; pending.current.onerror = null; pending.current = null }
    setImageError(false)
    const advance = () => {
      if (version !== request.current) return
      pending.current = null
      ready.current.add(next)
      setLoaded(values => values.map((value, i) => value || i === next))
      current.current = next
      setIndex(next)
    }
    if (ready.current.has(next)) { advance(); return }
    // Keep the current photograph visible until the requested responsive image loads.
    const image = new window.Image(), source = siteImage(slides[next].image)
    pending.current = image
    image.onload = advance
    image.onerror = () => { if (version === request.current) { pending.current = null; setImageError(true) } }
    image.sizes = sizes
    image.srcset = source.srcSet
    image.src = source.src
  }, [])

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px) and (pointer: fine)")
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    const preferences = () => setCanRotate(desktop.matches && !reduced.matches)
    const visibility = () => setVisible(!document.hidden)
    preferences(); visibility()
    desktop.addEventListener("change", preferences); reduced.addEventListener("change", preferences)
    document.addEventListener("visibilitychange", visibility)
    return () => {
      desktop.removeEventListener("change", preferences); reduced.removeEventListener("change", preferences)
      document.removeEventListener("visibilitychange", visibility)
      request.current++
      if (pending.current) { pending.current.onload = null; pending.current.onerror = null; pending.current = null }
    }
  }, [])

  useEffect(() => {
    if (!canRotate || paused || hovered || !visible) return
    const timer = setInterval(() => { if (!pending.current) select(current.current + 1) }, 8000)
    return () => clearInterval(timer)
  }, [canRotate, paused, hovered, visible, select])

  function choose(next: number) { setPaused(true); select(next) }
  const rotationLabel = paused ? "Pokreni promenu slika" : "Zaustavi promenu slika"

  return (
    <section className={`theme-dark-surface ${styles.hero}`} role="region" aria-roledescription="carousel" aria-label={t("Kategorije")}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={event => { if (!(event.target as HTMLElement).closest("[data-hero-rotation]")) setPaused(true) }}
      onKeyDown={event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
        event.preventDefault(); choose(current.current + (event.key === "ArrowRight" ? 1 : -1))
      }}
      onTouchStart={event => { touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null }}
      onTouchCancel={() => { touch.current = null }}
      onTouchEnd={event => {
        const start = touch.current; touch.current = null
        if (!start || event.touches.length || event.changedTouches.length !== 1) return
        const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y
        if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) choose(current.current + (dx < 0 ? 1 : -1))
      }}>
      {slides.map((slide, i) => (
        <div key={slide.image} className={`${styles.slide} ${i === index ? styles.active : ""}`} aria-hidden={i !== index} inert={i !== index}
          role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${slides.length}`}>
          {loaded[i] && <SiteImage name={slide.image} alt="" priority={i === 0} sizes={sizes} className={styles.image} />}
          <div className={styles.shade} />
          <div className={styles.caption}>
            <Link href={slide.href} className={styles.category} prefetch={false}>
              <h2>{t(slide.title)}</h2><ArrowUpRight aria-hidden="true" />
            </Link>
            <p>{t(slide.subtitle)}</p>
          </div>
        </div>
      ))}
      <div className={styles.controls}>
        <div className={styles.arrows}>
          <button type="button" className={styles.icon} onClick={() => choose(current.current - 1)} aria-label={t("Prethodna slika")} title={t("Prethodna slika")}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" className={styles.icon} onClick={() => choose(current.current + 1)} aria-label={t("Sledeca slika")} title={t("Sledeca slika")}><ChevronRight aria-hidden="true" /></button>
        </div>
        <div className={styles.dots} role="group" aria-label={t("Izaberi kategoriju")}>
          {slides.map((slide, i) => <button key={slide.image} type="button" className={styles.dot} aria-label={t(slide.title)} title={t(slide.title)} aria-pressed={index === i} onClick={() => choose(i)}><span /></button>)}
        </div>
        <button type="button" data-hero-rotation className={`${styles.icon} ${styles.rotation}`} disabled={!canRotate} aria-label={t(rotationLabel)} title={t(rotationLabel)} onClick={() => setPaused(value => !value)}>
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </button>
      </div>
      {imageError && <p role="alert" className={styles.error}>{t("Slika nije ucitana. Pokusaj ponovo.")}</p>}
    </section>
  )
}
