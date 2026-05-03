"use client"

import { useEffect, useState } from "react"

const slides = [
  {
    src: "/images/hero/strane.jpg",
    title: "STRANE",
    subtitle: "Akordi i tekstovi",
    align: "left",
    overlay: "bg-gradient-to-r from-black/40 via-black/20 to-transparent",
  },
  {
    src: "/images/hero/domace.jpg",
    title: "DOMAĆE",
    subtitle: "Akustika i emocija",
    align: "left",
    overlay: "bg-gradient-to-r from-black/60 via-black/30 to-transparent",
  },
  {
    src: "/images/hero/narodne.jpg",
    title: "NARODNE",
    subtitle: "Kafana vibe",
    align: "right",
    overlay: "bg-gradient-to-l from-black/40 via-black/20 to-transparent",
  },
]

export default function Hero() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative w-full h-[70vh] overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* IMAGE */}
          <img
            src={slide.src}
            alt={slide.title}
            className="w-full h-full object-cover scale-105 transition-transform duration-[6000ms]"
          />

          {/* OVERLAY */}
          <div className={`absolute inset-0 ${slide.overlay}`} />

          {/* TEXT */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 px-8 md:px-16 ${
              slide.align === "left" ? "left-0 text-left" : "right-0 text-right"
            }`}
          >
            <h1 className="text-3xl md:text-5xl font-bold text-white">
              {slide.title}
            </h1>
            <p className="text-white/80 mt-2 text-lg">
              {slide.subtitle}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}