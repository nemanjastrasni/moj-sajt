"use client"

import { useEffect, useState } from "react"
import { useI18n } from "./UiText"
import SiteImage, { siteImage, type SiteImageName } from "./SiteImage"

const slides = [
  {
    image: "heroStrane" as SiteImageName,
    title: "STRANE",
    subtitle: "Akordi i tekstovi",
    align: "left",
    overlay: "bg-gradient-to-r from-black/40 via-black/20 to-transparent",
  },
  {
    image: "heroDomace" as SiteImageName,
    title: "ZABAVNE",
    subtitle: "Akustika i emocija",
    align: "left",
    overlay: "bg-gradient-to-r from-black/60 via-black/30 to-transparent",
  },
  {
    image: "heroNarodne" as SiteImageName,
    title: "NARODNE",
    subtitle: "Kafana vibe",
    align: "right",
    overlay: "bg-gradient-to-l from-black/40 via-black/20 to-transparent",
  },
]

export default function Hero() {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState([true, false, false])

  useEffect(() => {
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined, preload: HTMLImageElement | undefined
    const schedule = () => {
      if (timer) clearTimeout(timer)
      if (document.hidden) return
      timer = setTimeout(() => {
        const next = (index + 1) % slides.length, image = siteImage(slides[next].image)
        preload = new window.Image()
        const advance = () => { if (alive) { setLoaded(current => current.map((value, i) => value || i === next)); setIndex(next) } }
        preload.onload = advance; preload.onerror = advance
        preload.sizes = "(min-width: 1152px) 1120px, calc(100vw - 32px)"; preload.srcset = image.srcSet; preload.src = image.src
      }, 8000)
    }
    schedule(); document.addEventListener("visibilitychange", schedule)
    return () => { alive = false; if (timer) clearTimeout(timer); if (preload) { preload.onload = null; preload.onerror = null }; document.removeEventListener("visibilitychange", schedule) }
  }, [index])

  return (
    <section className="theme-dark-surface relative w-full h-[70vh] overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={slide.image}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* IMAGE */}
          {loaded[i] && <SiteImage
            name={slide.image}
            alt={slide.title}
            priority={i === 0}
            sizes="(min-width: 1152px) 1120px, calc(100vw - 32px)"
            className="w-full h-full object-cover scale-105 transition-transform duration-[6000ms]"
          />}

          {/* OVERLAY */}
          <div className={`absolute inset-0 ${slide.overlay}`} />

          {/* TEXT */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 px-8 md:px-16 ${
              slide.align === "left" ? "left-0 text-left" : "right-0 text-right"
            }`}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              {t(slide.title)}
            </h2>
            <p className="text-white/80 mt-2 text-lg">
              {t(slide.subtitle)}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}
