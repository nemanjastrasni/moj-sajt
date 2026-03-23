"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { signIn, signOut, useSession } from "next-auth/react"

export default function Menu() {
  const { data: session } = useSession()

  const [open, setOpen] = useState(false)
  const [openPesme, setOpenPesme] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [visits, setVisits] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/visits")
        const data = await res.json()
        setVisits(data.count || 0)
      } catch {}
    }
    load()
  }, [])

  return (
    <nav className="relative z-[9999] flex justify-between items-start pt-2 pb-2 pl-2 pr-6 bg-red-700 text-black shadow-md">

      {/* LEVA STRANA */}
      <div className="flex flex-col">

        <Link href="/">Home</Link>

        <button onClick={() => setOpenPesme(v => !v)}>
          Pesme
        </button>

        {openPesme && (
          <div>
            <Link href="/pesme/narodne">Narodne</Link>
            <Link href="/pesme/domace">Domaće</Link>
            <Link href="/pesme/strane">Strane</Link>
          </div>
        )}

        <Link href="/plejliste">Plejliste</Link>
        <Link href="/akordi">Akordi</Link>
        <Link href="/biografija">Biografija</Link>
        <Link href="/kontakt">Kontakt</Link>

        {session?.user?.role === "admin" && (
          <Link href="/admin">Admin</Link>
        )}

      </div>

      {/* SEARCH */}
      <div>
        <input
          value={query}
          onChange={async (e) => {
            const value = e.target.value
            setQuery(value)

            if (value.length < 2) return setResults([])

            const res = await fetch(`/api/search?q=${value}`)
            const data = await res.json()
            setResults(data)
          }}
          placeholder="Traženje..."
        />

        {results.map((song) => (
          <a
            key={song.id}
            href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
          >
            {song.artist.name} – {song.title}
          </a>
        ))}
      </div>

      {/* DESNA STRANA */}
      <div className="relative flex items-center gap-3">

        {session?.user?.role === "admin" && (
          <span>👥 {visits}</span>
        )}

        {!session ? (
          <button onClick={() => signIn()}>
            Login
          </button>
        ) : (
          <div className="relative">

            <div className="flex items-center gap-2">
              <span>{session.user?.name}</span>

              <img
                src={(session.user as any)?.image || "/avatars/gilmour.png"}
                onClick={() => setOpen(v => !v)}
                className="w-8 h-8 rounded-full cursor-pointer"
              />
            </div>

            {open && (
              <div className="absolute right-0 top-10 bg-white text-black p-2 rounded shadow">

                <p>{session.user?.email}</p>

                <a href="/profile">Profil</a>

                <button onClick={() => signOut()}>
                  Logout
                </button>

              </div>
            )}

          </div>
        )}

      </div>

    </nav>
  )
}