"use client"

import { useEffect, useState, useRef } from "react"

export default function PlaylistPlayer({ playlist }: any) {
  const items = playlist.items

  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [meta, setMeta] = useState<any>({})
  const touchStartX = useRef<number | null>(null)

 const [mode, setMode] = useState<"play" | "shuffle" | null>(null)

  // 🔥 FETCH TITLE + DURATION
  useEffect(() => {
    items.forEach(async (item: any) => {
      if (item.type !== "youtube") return

      const id = extractYoutubeId(item.url)

      try {
        const res = await fetch(`/api/youtube?id=${id}`)
        const data = await res.json()

        setMeta((prev: any) => ({
          ...prev,
          [item.id]: {
            title: data.title,
            duration: parseDuration(data.duration),
          },
        }))
      } catch {}
    })
  }, [items])

  const next = () => {
    setActiveIndex((prev) => (prev + 1) % items.length)
  }

  const prev = () => {
    setActiveIndex((prev) =>
      prev === 0 ? items.length - 1 : prev - 1
    )
  }

  // 🔥 AUTOPLAY (GLAVNI DEO)
  useEffect(() => {
  if (!mode) return

  const item = items[activeIndex]
  const duration = meta[item.id]?.duration

  if (!duration) return

  const timer = setTimeout(() => {
    if (mode === "play") {
      setActiveIndex((prev) => (prev + 1) % items.length)
    }

    if (mode === "shuffle") {
      const rand = Math.floor(Math.random() * items.length)
      setActiveIndex(rand)
    }
  }, (duration - 1) * 1000)

  return () => clearTimeout(timer)
}, [activeIndex, meta, mode])

  // 🔥 SWIPE
  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: any) => {
    if (touchStartX.current === null) return

    const diff = e.changedTouches[0].clientX - touchStartX.current

    if (diff > 50) prev()
    if (diff < -50) next()

    touchStartX.current = null
  }
  const activeItem = items[activeIndex]
  const prevItem = items[(activeIndex - 1 + items.length) % items.length]
  const nextItem = items[(activeIndex + 1) % items.length]
  const activeId = extractYoutubeId(activeItem.url)

  return (
    <div className="relative flex gap-10 pb-10 w-full">

      {/* 🔥 BLUR BACKGROUND */}
      <div
        className="absolute inset-0 -z-10 opacity-30 blur-2xl"
        style={{
          backgroundImage: `url(https://img.youtube.com/vi/${activeId}/0.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* LEFT LIST */}
      <div className="w-72 shrink-0 space-y-2 max-h-[400px] overflow-y-auto">

        {items.map((item: any, index: number) => (
          <div
            key={item.id}
            onClick={() => setActiveIndex(index)}
            className={`p-2 rounded cursor-pointer text-sm 
            ${activeIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}
          >
            🎵 {meta[item.id]?.title || "Loading..."}
          </div>
        ))}

      </div>
      {/* Player  controls*/}
      <div className="flex gap-4 mt-4 justify-center">

  <button
    onClick={() => setMode("play")}
    className={`px-3 py-1 rounded ${
      mode === "play" ? "bg-green-500" : "bg-white/10"
    }`}
  >
    ▶️
  </button>

  <button
    onClick={() => setMode("shuffle")}
    className={`px-3 py-1 rounded ${
      mode === "shuffle" ? "bg-blue-500" : "bg-white/10"
    }`}
  >
    🔀
  </button>

</div>

     {/* CENTER CAROUSEL */}
<div
  className="flex-1 flex flex-col items-center justify-center"
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>

  <div className="relative w-full h-80 flex items-center justify-center">

    {/* PREV */}
    <div className="absolute left-[15%] opacity-40 scale-75 transition-all duration-500">
      <img
        src={`https://img.youtube.com/vi/${extractYoutubeId(prevItem.url)}/0.jpg`}
        className="w-[260px] h-[150px] rounded"
      />
    </div>

    {/* CURRENT (FIXED CENTER) */}
    <div className="z-10">
      <iframe
        key={activeIndex}
        src={`https://www.youtube.com/embed/${activeId}?autoplay=1`}
        className="w-[420px] h-[236px] rounded shadow-xl"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>

    {/* NEXT */}
    <div className="absolute right-[15%] opacity-40 scale-75 transition-all duration-500">
      <img
        src={`https://img.youtube.com/vi/${extractYoutubeId(nextItem.url)}/0.jpg`}
        className="w-[260px] h-[150px] rounded"
      />
    </div>

  </div>

  {/* CONTROLS */}
  <div className="flex gap-4 mt-4 justify-center">
    <button onClick={prev} className="px-3 py-1 bg-white/10 rounded">
      ⬅
    </button>

    <button onClick={next} className="px-3 py-1 bg-white/10 rounded">
      ➡
    </button>
  </div>

</div>

    </div>
  )
}

// helpers
function extractYoutubeId(url: string) {
  const match =
    url.match(/v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?]+)/)
  return match?.[1] || ""
}
function parseDuration(duration: string) {
  const match = duration.match(/PT(\d+M)?(\d+S)?/)
  const minutes = match?.[1] ? parseInt(match[1]) : 0
  const seconds = match?.[2] ? parseInt(match[2]) : 0

  return minutes * 60 + seconds
}