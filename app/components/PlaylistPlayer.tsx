"use client"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
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
  const [items, setItems] = useState(playlist.items)
  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  })
)

  const timerRef = useRef<any>(null)
  const touchStartX = useRef<number | null>(null)

  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [meta, setMeta] = useState<any>({})
  const [mode, setMode] = useState<"play" | "shuffle" | null>(null)

  // CUSTOM DELETE MODAL
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const activeItem = items?.[activeIndex] || null
  const activeId = activeItem?.url
    ? extractYoutubeId(activeItem.url)
    : ""

  const prevItem = items.length
    ? items[(activeIndex - 1 + items.length) % items.length]
    : null

  const nextItem = items.length
    ? items[(activeIndex + 1) % items.length]
    : null

  const next = () => {
    setActiveIndex((prev) => (prev + 1) % items.length)
  }

  const prev = () => {
    setActiveIndex((prev) =>
      prev === 0 ? items.length - 1 : prev - 1
    )
  }

  useEffect(() => {
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.body.appendChild(tag)

    ;(window as any).onYouTubeIframeAPIReady = () => {
      console.log("YT API READY")
    }
  }, [])

  useEffect(() => {
    if (!(window as any).YT) return

    const YT = (window as any).YT
    if (!YT.Player) return
    if (!activeItem) return

    const id = extractYoutubeId(activeItem.url)

    if ((window as any).player) {
      ;(window as any).player.destroy()
    }

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
            if (mode === "shuffle") {
              const randomIndex = Math.floor(
                Math.random() * items.length
              )
              setActiveIndex(randomIndex)
            }

            if (mode === "play") {
              setActiveIndex((prev) =>
                (prev + 1) % items.length
              )
            }
          }
        },
      },
    })
  }, [activeIndex, mode])

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

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: any) => {
    if (touchStartX.current === null) return

    const diff =
      e.changedTouches[0].clientX - touchStartX.current

    if (diff > 50) prev()
    if (diff < -50) next()

    touchStartX.current = null
  }

  return (
    <>
      <div className="relative flex gap-10 pb-10 w-full">

        {/* BACKGROUND */}
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
  sensors={sensors}
  collisionDetection={closestCenter}
            onDragEnd={async (event) => {
              const { active, over } = event

              if (!over || active.id === over.id) return

              const oldIndex = items.findIndex(
                (i: any) => i.id === active.id
              )

              const newIndex = items.findIndex(
                (i: any) => i.id === over.id
              )

              const newItems = arrayMove(
                items,
                oldIndex,
                newIndex
              )

              setItems(newItems)

              await fetch(
                "/api/listening-playlist/reorder",
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    playlistId: playlist.id,
                    items: newItems.map(
                      (i: any) => i.id
                    ),
                  }),
                }
              )
            }}
          >
            <SortableContext
              items={items}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item: any) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  meta={meta}
                  items={items}
                  setItems={setItems}
                  setDeleteTarget={setDeleteTarget}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* PLAYER */}
        <div
          className="flex-1 flex flex-col items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode("play")}
              className={`px-3 py-1 rounded ${
                mode === "play"
                  ? "bg-green-500"
                  : "bg-white/10"
              }`}
            >
              ▶ Play
            </button>

            <button
              onClick={() => setMode("shuffle")}
              className={`px-3 py-1 rounded ${
                mode === "shuffle"
                  ? "bg-blue-500"
                  : "bg-white/10"
              }`}
            >
              🔀 Shuffle
            </button>
          </div>

          <div className="relative w-full h-80 flex items-center justify-center">

            <div className="absolute left-[15%] opacity-40 scale-75">
              <img
                src={`https://img.youtube.com/vi/${
                  prevItem?.url
                    ? extractYoutubeId(prevItem.url)
                    : ""
                }/0.jpg`}
                className="w-[260px] h-[150px] rounded"
              />
            </div>

            <div className="z-10">
              <div
                id="yt-player"
                className="w-[420px] h-[236px] rounded shadow-xl overflow-hidden"
              />
            </div>

            <div className="absolute right-[15%] opacity-40 scale-75">
              <img
                src={`https://img.youtube.com/vi/${
                  nextItem?.url
                    ? extractYoutubeId(nextItem.url)
                    : ""
                }/0.jpg`}
                className="w-[260px] h-[150px] rounded"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={prev}
              className="px-2 py-1 bg-white/10 rounded text-xs"
            >
              ⬅
            </button>

            <button
              onClick={next}
              className="px-2 py-1 bg-white/10 rounded text-xs"
            >
              ➡
            </button>
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
          <div className="bg-[#111] border border-gray-700 rounded-xl p-6 w-[380px]">
            <h3 className="text-lg font-semibold mb-3 text-white">
              Obriši pesmu?
            </h3>

            <p className="text-sm text-gray-400 mb-6">
              Da li si siguran da želiš da obrišeš ovu pesmu?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded bg-white/10"
              >
                Otkaži
              </button>

              <button
                onClick={async () => {
                  const res = await fetch(
                    `/api/listening-playlist/item/${deleteTarget.id}`,
                    {
                      method: "DELETE",
                    }
                  )

                  if (res.ok) {
                    setItems((prev: any[]) =>
                      prev.filter(
                        (i) =>
                          i.id !== deleteTarget.id
                      )
                    )
                  }

                  setDeleteTarget(null)
                }}
                className="px-4 py-2 rounded bg-red-500 text-white"
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SortableItem({
  item,
  activeIndex,
  setActiveIndex,
  meta,
  items,
  setDeleteTarget,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const currentIndex = items.findIndex(
    (i: any) => i.id === item.id
  )

  return (
  <div
    ref={setNodeRef}
    style={style}
    className={`p-2 rounded text-sm ${
      activeIndex === currentIndex
        ? "bg-white/10"
        : "hover:bg-white/5"
    }`}
  >
    <div className="flex justify-between items-center gap-2">

      {/* CLICK TO PLAY */}
      <span
        onClick={() => setActiveIndex(currentIndex)}
        className="cursor-pointer flex-1"
      >
        🎵 {meta[item.id]?.title || "Loading..."}
      </span>

      {/* DRAG HANDLE */}
      <div
  {...attributes}
  {...listeners}
  className="cursor-grab text-gray-400 text-sm px-3 py-2 flex items-center"
>
  ☰
</div>

      {/* DELETE */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDeleteTarget(item)
        }}
        className="text-red-400 text-xs"
      >
        ✕
      </button>
    </div>
  </div>
)
}

function extractYoutubeId(url: string) {
  const match =
    url.match(/v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?]+)/)

  return match?.[1] || ""
}

function parseDuration(duration: string) {
  const match =
    duration.match(/PT(\d+M)?(\d+S)?/)

  const minutes = match?.[1]
    ? parseInt(match[1])
    : 0

  const seconds = match?.[2]
    ? parseInt(match[2])
    : 0

  return minutes * 60 + seconds
}

