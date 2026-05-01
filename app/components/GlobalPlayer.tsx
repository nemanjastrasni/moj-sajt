"use client"

import { useState } from "react"

export default function GlobalPlayer({ url }: { url: string }) {
  const [open, setOpen] = useState(true)

  if (!url || !open) return null

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black border-t border-gray-800 p-2 z-50">
      
      {/* CLOSE */}
      <button
        onClick={() => setOpen(false)}
        className="absolute right-3 top-1 text-gray-400 text-sm"
      >
        ✕
      </button>

      {/* PLAYER */}
      <iframe
        src={url}
        className="w-full h-16 rounded-md"
        loading="lazy"
        allow="autoplay"
      />
    </div>
  )
}