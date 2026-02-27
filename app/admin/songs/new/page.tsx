"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewSongPage() {
  const router = useRouter()

  const [artist, setArtist] = useState("")
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("narodne")
  const [lyrics, setLyrics] = useState("")
  const [bio, setBio] = useState("")
  const [discography, setDiscography] = useState("")
  const [showBio, setShowBio] = useState(false)
  const [showDisc, setShowDisc] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [suggestions, setSuggestions] = useState<any[]>([])

  async function handleArtistChange(value: string) {
    setArtist(value)

    if (value.length < 2) {
      setSuggestions([])
      return
    }

    const res = await fetch(`/api/admin/artists?search=${value}`)
    if (!res.ok) {
      setSuggestions([])
      return
    }

    const data = await res.json()
    setSuggestions(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/admin/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        artistName: artist,
        category,
        lyrics,
        artistBio: bio,
        artistDiscography: discography,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Greška")
      setLoading(false)
      return
    }

    router.push("/admin/songs")
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">
        Nova pesma
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* IZVOĐAČ */}
        <div className="relative">
          <label className="block text-sm font-semibold text-black mb-1">
            Izvođač
          </label>

          <input
            type="text"
            value={artist}
            onChange={(e) => handleArtistChange(e.target.value)}
            className="w-full border p-2 rounded text-gray-800"
            required
          />

          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full border bg-white mt-1 max-h-40 overflow-auto">
              {suggestions.map((a) => (
                <div
                  key={a.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer text-gray-800"
                  onMouseDown={(e) => {
                    e.preventDefault()

                    setArtist(a.name)
                    setBio(a.bio || "")
                    setDiscography(a.discography || "")
                    if (a.category) {
                      setCategory(a.category.trim().toLowerCase())
                    }
                    setSuggestions([])
                  }}
                >
                  {a.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BIO */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-semibold text-black">
              Biografija
            </label>
            <button
              type="button"
              onClick={() => setShowBio(!showBio)}
              className="text-sm text-blue-600 font-medium"
            >
              {showBio ? "Zatvori" : bio ? "Edit" : "Dodaj"}
            </button>
          </div>

          {showBio && (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              className="w-full border p-2 rounded text-gray-800"
            />
          )}
        </div>

        {/* DISKOGRAFIJA */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-semibold text-black">
              Diskografija
            </label>
            <button
              type="button"
              onClick={() => setShowDisc(!showDisc)}
              className="text-sm text-blue-600 font-medium"
            >
              {showDisc ? "Zatvori" : discography ? "Edit" : "Dodaj"}
            </button>
          </div>

          {showDisc && (
            <textarea
              value={discography}
              onChange={(e) => setDiscography(e.target.value)}
              rows={5}
              className="w-full border p-2 rounded text-gray-800"
            />
          )}
        </div>

        {/* NASLOV */}
        <div>
          <label className="block text-sm font-semibold text-black mb-1">
            Naslov pesme
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border p-2 rounded text-gray-800"
            required
          />
        </div>

        {/* KATEGORIJA */}
        <div>
          <label className="block text-sm font-semibold text-black mb-1">
            Kategorija
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border p-2 rounded text-gray-800"
          >
            <option value="narodne">Narodne</option>
            <option value="domace">Domaće</option>
            <option value="strane">Strane</option>
          </select>
        </div>

        {/* TEKST */}
        <div>
          <label className="block text-sm font-semibold text-black mb-1">
            Tekst pesme sa akordima
          </label>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={16}
            className="w-full border p-3 rounded text-gray-800"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Čuvam..." : "Sačuvaj"}
        </button>
      </form>
    </div>
  )
}