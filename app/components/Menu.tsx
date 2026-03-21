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

  const role = (session?.user as any)?.role

  // (opciono) fetch visits ako koristiš
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

   <nav className="relative z-[9999] flex justify-between items-start pt-2 pb-2 pl-2 pr-6 bg-red-700 text-black shadow-md overflow-visible">
  {/* LEVA STRANA */}
  <div className="relative z-10 space-y-2 flex flex-col items-start">

    <Link href="/" className="string w-64 block">
      <span>Home</span>
    </Link>
    {/* admin link uklonjen */}
<p>{role}</p>
     {/* PESME DROPDOWN */}
     <div>
      <button
        type="button"
        onClick={() => setOpenPesme((v) => !v)}
        className="string w-72 ml-6 text-left"
      >
        <span>Pesme</span>
      </button>

      <div
        className={`transition-all duration-500 ease-in-out ${
          openPesme ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex gap-10 ml-16 text-sm">
          <Link href="/pesme/narodne" className="string w-40">
            <span>Narodne</span>
          </Link>
          <Link href="/pesme/domace" className="string w-40">
            <span>Domaće</span>
          </Link>
          <Link href="/pesme/strane" className="string w-40">
            <span>Strane</span>
          </Link>
        </div>
      </div>
    </div>

    <Link href="/plejliste" className="string w-[22rem] ml-12 block">
      <span>Plejliste</span>
    </Link>

    <Link href="/akordi" className="string w-80 ml-20 block">
      <span>Akordi</span>
    </Link>

    <Link href="/biografija" className="string w-96 ml-28 block">
      <span>Biografija</span>
    </Link>
   
   {/* KONTAKT*/}
   <Link href="/kontakt" className="string w-[28rem] ml-36 block">
  <span>Kontakt</span>
</Link>
     
    {/* ADMIN */}
    {session?.user?.role === "admin" && (
      <Link
        href=""
        className="string w-[30rem] ml-44 block font-semibold"
      >
        <span>Admin</span>
      </Link>
    )}

  </div>
     {/* SEARCH CENTER */}
<div className="absolute left-1/2 -translate-x-1/2 top-32 z-50">

  <input
    value={query}
    onChange={async (e) => {
      const value = e.target.value
      setQuery(value)

      if (value.length < 2) {
        setResults([])
        return
      }

      const res = await fetch(`/api/search?q=${value}`)
      const data = await res.json()
      setResults(data)
    }}
    type="text"
    placeholder="Traženje pesama..."
    className="w-[340px] bg-black/40 border border-gray-600 rounded-lg px-3 py-1 text-white outline-none focus:border-blue-400"
  />

  {results.length > 0 && (
    <div className="fixed mt-2 w-[340px] bg-neutral-900 text-gray-100 shadow-2xl rounded-xl border border-gray-600 z-[99999]">
      {results.map((song) => (
        <a
          key={song.id}
          href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
          className="block px-4 py-2 hover:bg-white/10 transition"
        >
          {song.artist.name} – {song.title}
        </a>
      ))}
    </div>
  )}

</div>

<a href="/profile">Profil</a>
  {/* DESNA STRANA */}
<div className="relative z-10 flex items-center gap-4 ml-auto">

  {session?.user?.role === "admin" && (
    <div className="text-xs text-white mr-4">
      👥 {visits}
    </div>
  )}

  {!session ? (
    <button
      onClick={() => signIn("github")}
      className="px-5 py-2 bg-black text-white rounded-lg hover:opacity-80 transition"
    >
      Login
    </button>
  ) : (
    <div className="relative">

      {/* AVATAR */}
      <img
        src={(session.user as any)?.image || "/avatars/1.png"}
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full cursor-pointer border hover:scale-105 transition"
      />

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white shadow-lg rounded-xl p-2 text-sm z-50">

          <p className="px-2 py-1 text-gray-500 truncate">
            {session.user?.email}
          </p>

          <a
            href="/profile"
            className="block px-2 py-2 hover:bg-gray-100 rounded"
          >
            Profil
          </a>

          {(session.user as any)?.role === "admin" && (
            <a
              href="/admin"
              className="block px-2 py-2 hover:bg-gray-100 rounded"
            >
              Admin
            </a>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left px-2 py-2 hover:bg-gray-100 rounded"
          >
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