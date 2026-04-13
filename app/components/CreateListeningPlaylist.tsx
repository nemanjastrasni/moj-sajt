"use client"

import { useState } from "react"

export default function CreateListeningPlaylist() {
  const [name, setName] = useState("")

  const onSubmit = async (e: any) => {
    e.preventDefault()

    await fetch("/api/listening-playlist", {
      method: "POST",
      body: new URLSearchParams({ name }),
    })

    window.location.reload()
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 mb-8">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ime playliste..."
        className="flex-1 p-2 rounded bg-black border border-gray-700"
      />
      <button className="bg-white text-black px-4 py-2 rounded">
        + Kreiraj
      </button>
    </form>
  )
}