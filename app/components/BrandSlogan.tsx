"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Pause, Play } from "lucide-react"
import { DEFAULT_BRANDING, validateBranding, type BrandingConfig } from "@/lib/branding/model"
import { useI18n } from "./UiText"

export default function BrandSlogan() {
  const { locale, t } = useI18n()
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_BRANDING), [index, setIndex] = useState(0), [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const [reduced, setReduced] = useState(true), [visible, setVisible] = useState(true), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false)
  useEffect(() => {
    let disposed = false
    const controller = new AbortController(), deadline = setTimeout(() => controller.abort(), 8000)
    void fetch("/api/site-branding", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) return
      const next = validateBranding(await response.json())
      if (!controller.signal.aborted) { setConfig(next); setIndex(0) }
    }).catch(() => {}).finally(() => { clearTimeout(deadline); if (!disposed) setReady(true) })
    return () => { disposed = true; controller.abort(); clearTimeout(deadline) }
  }, [])
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(preference.matches), visibility = () => setVisible(!document.hidden)
    update(); visibility(); preference.addEventListener("change", update); document.addEventListener("visibilitychange", visibility)
    return () => { preference.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility) }
  }, [])
  const slogans = config.slogans.filter(item => item.enabled), selected = index % slogans.length
  useEffect(() => {
    if (!ready || !config.rotate || slogans.length < 2 || paused || reduced || !visible || hovered || focused) return
    const timer = setInterval(() => setIndex(value => (value + 1) % slogans.length), config.intervalSeconds * 1000)
    return () => clearInterval(timer)
  }, [ready, config.rotate, config.intervalSeconds, slogans.length, paused, reduced, visible, hovered, focused])
  return <div className="brand-slogans" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <p className="home-brand-slogan" aria-live="off" aria-busy={!ready}>{slogans.map((item, position) => <span key={item.id} className="brand-slogan-text" data-active={ready && position === selected} aria-hidden={!ready || position !== selected}>{locale === "en" && item.textEn ? item.textEn : item.text}</span>)}</p>
    {ready && slogans.length > 1 && <div className="brand-slogan-controls">
      {config.rotate && !reduced && <button type="button" onClick={() => { if (paused) { setFocused(false); setHovered(false) }; setPaused(value => !value) }} aria-label={t(paused ? "Pokreni smenjivanje slogana" : "Pauziraj smenjivanje slogana")} title={t(paused ? "Pokreni smenjivanje slogana" : "Pauziraj smenjivanje slogana")}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}</button>}
      <button type="button" onClick={() => { setPaused(true); setIndex(value => (value + 1) % slogans.length) }} aria-label={t("Sledeći slogan")} title={t("Sledeći slogan")}><ChevronRight aria-hidden="true" /></button>
    </div>}
  </div>
}
