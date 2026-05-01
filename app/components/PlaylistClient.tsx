"use client"

import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core"

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"

import { CSS } from "@dnd-kit/utilities"
import Link from "next/link"
import { useState } from "react"

type SongItem = {
  id: string
  songId: string
  playlistId: string
  order: number | null
  song: {
    title: string
    slug: string
    category: string
    artist: {
      name: string
      slug: string
    }
  }
}

function SortableItem({ item }: { item: SongItem }) {
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
      className="flex justify-between items-center py-2 border-b border-gray-800"
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab px-2">
          ☰
        </div>

        <Link href={`/pesme/${item.song.category}/${item.song.artist.slug}/${item.song.slug}`}>
          <span className="text-gray-400">{item.song.artist.name}</span>{" "}
          <span className="text-white">- {item.song.title}</span>
        </Link>
      </div>

      <button
        onClick={async () => {
          await fetch("/api/playlist", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playlistId: item.playlistId,
              songId: item.songId,
            }),
          })

          location.reload()
        }}
        className="text-red-400 hover:text-red-600"
      >
        Obriši
      </button>
    </div>
  )
}

export default function PlaylistClient({
  playlistId,
  initialSongs,
}: {
  playlistId: string
  initialSongs: SongItem[]
}) {
  const [songs, setSongs] = useState<SongItem[]>(initialSongs)

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={async (event) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = songs.findIndex(s => s.id === active.id)
        const newIndex = songs.findIndex(s => s.id === over.id)

        const newItems = arrayMove(songs, oldIndex, newIndex)

        setSongs(newItems)

        await fetch("/api/playlist/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: newItems.map((s, i) => ({
              id: s.id,
              order: i,
            })),
          }),
        })
      }}
    >
      <SortableContext
        items={songs.map(s => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {songs.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}