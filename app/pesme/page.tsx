"use client"

import Link from "next/link"
import { songs } from "@/app/lib/data/songs"
import { useParams, notFound } from "next/navigation"

export default function CategoryPage() {
  const { category } = useParams() as { category: string }

  const filteredSongs = songs.filter(
    (song) => song.category === category
  )

  if (filteredSongs.length === 0) {
    return notFound()
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>{category.toUpperCase()}</h1>

      <ul>
        {filteredSongs.map((song) => (
          <li key={song.id}>
            <Link href={`/pesme/${song.category}/${song.artist}/${song.id}`}>
              {song.artistFull} - {song.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

