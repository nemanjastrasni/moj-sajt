"use client"

import { useState } from "react"

export default function ListeningPlaylistClient({ playlist }: any) {
  const [current, setCurrent] = useState<string | null>(null)
  const [url, setUrl] = useState("")

  async function addSong() {
    if (!url) return

    await fetch("/api/listening-playlist/item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playlistId: playlist.id,
        url,
      }),
    })

    setUrl("")
    window.location.reload()
  }

  function getEmbed(item: any) {
    if (item.type === "youtube") {
      const id = item.url.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1]
      return `https://www.youtube.com/embed/${id}`
    }

    if (item.type === "spotify") {
      const match = item.url.match(/(track|album|playlist)\/([a-zA-Z0-9]+)/)
      return `https://open.spotify.com/embed/${match?.[1]}/${match?.[2]}`
    }

    if (item.type === "soundcloud") {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(item.url)}`
    }

    return item.url
  }

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>{playlist.name}</h1>

      {/* ADD */}
      <div style={{ margin: "20px 0" }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste link..."
          className="border p-2 w-full rounded mb-2"
        />

        <button
          onClick={addSong}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Dodaj pesmu
        </button>
      </div>

      {/* PLAYER */}
      {current && (
        <iframe src={current} className="w-full h-64 mb-6" />
      )}

      {/* LISTA */}
      <div style={{ display: "grid", gap: "10px" }}>
        {playlist.items.map((item: any) => (
          <button
            key={item.id}
            onClick={() => setCurrent(getEmbed(item))}
          >
            ▶ {item.title || item.url}
          </button>
        ))}
      </div>
    </div>
  )
}