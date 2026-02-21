"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewSongPage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [category, setCategory] = useState("ostalo")
  const [lyrics, setLyrics] = useState("")
  const [chords, setChords] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/admin/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        artist,
        category,
        lyrics,
        chords,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Greška")
      setLoading(false)
      return
    }

    // ✅ uspešno
    setLoading(false)
    router.push("/admin/songs")
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Nova pesma</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <input
          type="text"
          placeholder="Naslov"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2"
          required
        />

        <input
          type="text"
          placeholder="Izvođač"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          className="w-full border p-2"
          required
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border p-2"
        >
          <option value="narodne">Narodne</option>
          <option value="domace">Domaće</option>
          <option value="strane">Strane</option>
          <option value="ostalo">Ostalo</option>
        </select>

        <textarea
          placeholder="Tekst pesme"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={6}
          className="w-full border p-2"
        />

        <textarea
          placeholder="Akordi"
          value={chords}
          onChange={(e) => setChords(e.target.value)}
          rows={4}
          className="w-full border p-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-6 py-2 disabled:opacity-50"
        >
          {loading ? "Čuvam..." : "Sačuvaj"}
        </button>
      </form>
    </div>
  )
}