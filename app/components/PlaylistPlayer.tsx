"use client"
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core"

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"

import { CSS } from "@dnd-kit/utilities"

import { useEffect, useState, useRef } from "react"

export default function PlaylistPlayer({ playlist }: any) {
  const items = playlist.items

  const timerRef = useRef<any>(null)
  const touchStartX = useRef<number | null>(null)

  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [meta, setMeta] = useState<any>({})
  const [mode, setMode] = useState<"play" | "shuffle" | null>(null)

  // 🎯 DERIVED STATE
  const activeItem = items?.[activeIndex] || null
  const isPlaying = mode === "play"
  const isShuffle = mode === "shuffle"
  

  useEffect(() => {
  if (!(window as any).YT) return

  const YT = (window as any).YT

  if (!YT.Player) return

  if (!activeItem) return

  const id = extractYoutubeId(activeItem.url)

  // 🔥 DESTROY ako postoji
  if ((window as any).player) {
    ;(window as any).player.destroy()
  }

  // 🔥 KREIRAJ PLAYER
  ;(window as any).player = new YT.Player("yt-player", {
    videoId: id,
    playerVars: {
      autoplay: 1,
    },
    events: {
      onReady: (e: any) => {
        e.target.playVideo()
      },
      onStateChange: (event: any) => {
  if (event.data === 0) {
    console.log("YT ENDED")

    if (mode === "shuffle") {
      const randomIndex = Math.floor(Math.random() * items.length)
      setActiveIndex(randomIndex)
    }

    if (mode === "play") {
      setActiveIndex((prev) => (prev + 1) % items.length)
    }
  }
},
    },
  })
}, [activeIndex, mode])

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

  // ▶ NEXT / PREV
  const next = () => {
    setActiveIndex((prev) => (prev + 1) % items.length)
  }

  const prev = () => {
    setActiveIndex((prev) =>
      prev === 0 ? items.length - 1 : prev - 1
    )
  }
  // Youtube script
  useEffect(() => {
  const tag = document.createElement("script")
  tag.src = "https://www.youtube.com/iframe_api"
  document.body.appendChild(tag)

  ;(window as any).onYouTubeIframeAPIReady = () => {
    console.log("YT API READY")
  }
}, [])

  // 🔥 AUTOPLAY (STABILAN)
  useEffect(() => {
    if (!isPlaying) return

    const id = items[activeIndex]?.id
    const duration = meta[id]?.duration

    if (!duration || duration < 5) return

    console.log("START TIMER:", duration)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      console.log("NEXT SONG TRIGGER")

      setActiveIndex((prev) => {
        if (isShuffle) {
          return Math.floor(Math.random() * items.length)
        }
        return (prev + 1) % items.length
      })
    }, (duration - 1) * 1000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [activeIndex, isPlaying, isShuffle])

  //listner za end
  useEffect(() => {
  const interval = setInterval(() => {
    const iframe = document.getElementById("yt-player") as HTMLIFrameElement
    if (!iframe) return

    iframe.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: "getPlayerState",
      }),
      "*"
    )
  }, 1000)

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.data)

      // 0 = video ended
      if (data.info === 0) {
        console.log("YOUTUBE END DETECTED")

        setActiveIndex((prev) => {
          if (mode === "shuffle") {
            return Math.floor(Math.random() * items.length)
          }
          return (prev + 1) % items.length
        })
      }
    } catch {}
  }

  window.addEventListener("message", handleMessage)

  return () => {
    clearInterval(interval)
    window.removeEventListener("message", handleMessage)
  }
}, [mode])

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

  const prevItem = items.length
  ? items[(activeIndex - 1 + items.length) % items.length]
  : null

  const nextItem = items.length
  ? items[(activeIndex + 1) % items.length]
  : null

  const activeId = activeItem?.url ? extractYoutubeId(activeItem.url) : ""

  return (
    <div className="relative flex gap-10 pb-10 w-full">

      {/* 🔥 BACKGROUND */}
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

  <DndContext
    collisionDetection={closestCenter}
    onDragEnd={async (event) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = items.findIndex((i: any) => i.id === active.id)
      const newIndex = items.findIndex((i: any) => i.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)

      await fetch("/api/listening-playlist/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: playlist.id,
          items: newItems.map((i: any) => i.id),
        }),
      })

      location.reload()
    }}
  >

    <SortableContext items={items} strategy={verticalListSortingStrategy}>

      {items.map((item: any, index: number) => (
        <SortableItem
          key={item.id}
          item={item}
          index={index}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          meta={meta}
          items={items}
          playlist={playlist}
        />
      ))}

    </SortableContext>
  </DndContext>
</div>

      {/* CENTER PLAYER */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* 🔥 DUGMAD (SADA NA PRAVOM MESTU) */}
        <div className="flex gap-2 mb-3">
          <button
  onClick={() => setMode((prev) => (prev === "play" ? null : "play"))}
  className={`px-3 py-1 rounded ${
    mode === "play" ? "bg-green-500" : "bg-white/10"
  }`}
>
  ▶ Play
</button>

<button
  onClick={() => setMode((prev) => (prev === "shuffle" ? null : "shuffle"))}
  className={`px-3 py-1 rounded ${
    mode === "shuffle" ? "bg-blue-500" : "bg-white/10"
  }`}
>
  🔀 Shuffle
</button>
        </div>

        <div className="relative w-full h-80 flex items-center justify-center">

          {/* PREV */}
          <div className="absolute left-[15%] opacity-40 scale-75">
            <img
              src={`https://img.youtube.com/vi/${prevItem?.url ? extractYoutubeId(prevItem.url) : ""}/0.jpg`}
              className="w-[260px] h-[150px] rounded"
            />
          </div>

          {/* CURRENT */}
          <div className="z-10">
  <div
    id="yt-player"
    className="w-[420px] h-[236px] rounded shadow-xl overflow-hidden"
  />
</div>

          {/* NEXT */}
          <div className="absolute right-[15%] opacity-40 scale-75">
            <img
              src={`https://img.youtube.com/vi/${nextItem?.url ? extractYoutubeId(nextItem.url) : ""}/0.jpg`}
              className="w-[260px] h-[150px] rounded"
            />
          </div>

        </div>

        {/* strelice */}
        <div className="flex gap-3 mt-4">
          <button onClick={prev} className="px-2 py-1 bg-white/10 rounded text-xs">
            ⬅
          </button>
          <button onClick={next} className="px-2 py-1 bg-white/10 rounded text-xs">
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

function SortableItem({
  item,
  index,
  activeIndex,
  setActiveIndex,
  meta,
  items,
  playlist,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setActiveIndex(index)}
      className={`p-2 rounded cursor-grab text-sm 
      ${activeIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      <div className="flex justify-between items-center">
        <span>
          🎵 {meta[item.id]?.title || "Loading..."}
        </span>

        {/* DELETE */}
        <button
          onClick={async (e) => {
            e.stopPropagation()

            await fetch("/api/listening-playlist/item", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: item.id }),
            })

            location.reload()
          }}
          className="text-red-400 text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}