"use client"

import { useState } from "react"

export default function LikePlaylistButton({
  playlistId,
}: {
  playlistId: string
}) {
  const [loading, setLoading] = useState(false)

  const handleLike = async () => {
    setLoading(true)

    await fetch("/api/listening-playlist-like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playlistId,
      }),
    })

    window.location.reload()
  }

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className="mt-3 px-3 py-1 rounded bg-white/10 hover:bg-white/20"
    >
      ❤️ Like
    </button>
  )
}