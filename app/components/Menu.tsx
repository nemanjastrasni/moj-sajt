"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { signIn, signOut, useSession } from "next-auth/react"



export default function Menu() {
  const [openPesme, setOpenPesme] = useState(false)
  const { data: session } = useSession()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [visits,setVisits] = useState(0)
  

  useEffect(()=>{
fetch("/api/analytics",{method:"POST"})

fetch("/api/analytics-count")
.then(r=>r.json())
.then(d=>setVisits(d.count))
},[])
  
  return (
   <nav className="relative z-50 flex justify-between items-start pt-6 pb-6 px-10 bg-red-700 text-black shadow-md overflow-visible">
      <div className="relative z-10 space-y-6">

        <Link href="/" className="string w-64 block">
          <span>Home</span>
        </Link>

        
      
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
            className={` transition-all duration-500 ease-in-out ${
              openPesme ? "max-h-40 opacity-100 mt-6" : "max-h-0 opacity-0"
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

{/* SEARCH */}

        <div className="string w-[28rem] ml-36 relative group">
  <span>Kontakt</span>
  <span className="absolute left-[12rem] italic text-gray-400 opacity-30 pointer-events-none select-none">
  Traženje pesama
</span>

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
  placeholder=""
  className="absolute top-0 left-[12rem] w-[16rem] opacity-0 group-hover:opacity-100 bg-transparent outline-none text-white"
/>
  {results.length > 0 && (
  <div className="relative mt-2 w-[22rem] bg-gradient-to-b from-neutral-900/90 to-neutral-800/90 backdrop-blur-md text-gray-100 shadow-2xl rounded-xl border border-gray-600/30 z-[999]">
    {results.map((song) => (
      <a
        key={song.id}
        href={`/pesme/${song.category}/${song.artist.slug}/${song.slug}`}
        className="block px-4 py-2 hover:bg-white/10 transition rounded-md font-medium tracking-wide"
      >
        {song.artist.name} – {song.title}
      </a>
    ))}
  </div>
)}
</div>
        
       {/* ✅ ADMIN LINK – samo admin */}
{session?.user?.role === "admin" && (
  <Link
    href="/admin"
    className="string w-[30rem] ml-44 block font-semibold"
  >
    <span>Admin</span>
  </Link>
)}
</div>

{/* DESNA STRANA – LOGIN (USER) */}
<div className="relative z-10 flex items-center gap-4">

  {/* ADMIN ANALYTICS */}
  {session?.user?.role === "admin" && (
    <div className="text-xs text-white mr-4">
      👥 {visits}
    </div>
  )}

  {/* USER LOGIN */}
  {!session ? (
    <button
      onClick={() => signIn()}
      className="px-5 py-2 bg-black text-white rounded-lg hover:opacity-80 transition"
    >
      Login
    </button>
  ) : (
    <div className="flex items-center gap-3">

      {session.user?.image && (
        <img
          src={session.user.image}
          alt="avatar"
          className="w-10 h-10 rounded-full border"
        />
      )}

      {/* IME + ROLE */}
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium text-red-700">
          {session.user?.name}
        </span>

        <span
          className={`text-[10px] uppercase tracking-wide font-semibold ${
            session.user?.role === "admin"
              ? "text-blue-400"
              : "text-gray-600"
          }`}
        >
          {session.user?.role}
        </span>
      </div>

      <button
        onClick={() => signOut()}
        className="px-3 py-1 bg-gray-200 rounded-md text-sm hover:bg-gray-300 transition"
      >
        Logout
      </button>

    </div>
  )}
</div>
</nav>
  )
}