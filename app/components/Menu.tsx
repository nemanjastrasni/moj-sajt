"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"

export default function Menu() {
  const { data: session } = useSession()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [openPesme, setOpenPesme] = useState(false)
  const [online, setOnline] = useState({ total: 0, loggedIn: 0 })

  useEffect(() => {
    async function heartbeat() {
      try {
        const res = await fetch("/api/online", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        })
        const data = await res.json()
        setOnline({
          total: data.total || 0,
          loggedIn: data.loggedIn || 0,
        })
      } catch {}
    }

    heartbeat()

    const interval = window.setInterval(heartbeat, 30000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        heartbeat()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return (
    <nav className="relative z-[9999] flex justify-between items-start pt-2 pb-28 pl-2 pr-6 bg-red-700 text-black shadow-md overflow-hidden">
      <div className="relative z-10 space-y-2 flex flex-col items-start">
        <Link href="/" className="string w-64 block">
          <span>Home</span>
        </Link>

        <div>
          <button
            type="button"
            onClick={() => setOpenPesme((v) => !v)}
            className="string w-72 ml-6 text-left"
          >
            <span>Pesme</span>
          </button>

          <div
            className={`transition-all duration-500 ${
              openPesme ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex gap-10 ml-16 text-sm">
              <Link href="/pesme/narodne" className="string w-40">
                Narodne
              </Link>
              <Link href="/pesme/domace" className="string w-40">
                Domace
              </Link>
              <Link href="/pesme/strane" className="string w-40">
                Strane
              </Link>
            </div>
          </div>
        </div>

        <Link href="/plejliste" className="string w-[22rem] ml-12 block">
          Plejliste
        </Link>

        <Link href="/akordi" className="string w-80 ml-20 block">
          Akordi
        </Link>

        <Link href="/biografija" className="string w-96 ml-28 block">
          Biografija
        </Link>

        <Link href="/kontakt" className="string w-[28rem] ml-36 block">
          Kontakt
        </Link>

        {session?.user?.role === "admin" && (
          <Link href="/admin" className="string w-[30rem] ml-44 block font-semibold">
            admin
          </Link>
        )}
      </div>

      <div className="absolute top-2 right-3 sm:right-6 z-20 flex items-center gap-2 sm:gap-4">
        <div
          className="hidden sm:block text-xs text-white mr-2 whitespace-nowrap"
          title="Korisnici trenutno na sajtu / ulogovani korisnici"
        >
          online {online.total} | login {online.loggedIn}
        </div>

        {!session ? (
          <button
            onClick={() => router.push("/login")}
            className="px-4 sm:px-5 py-2 bg-black text-white rounded-lg hover:opacity-80 transition"
          >
            Login
          </button>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2">
              {session?.user?.name && (
                <span className="hidden sm:inline text-sm text-gray-300 max-w-[160px] truncate">
                 {session.user.name}
                </span>
              )}

              <img
                src={session.user?.image || "/avatars/gilmour.png"}
                alt={session.user?.name || "User avatar"}
                onClick={() => setOpen(!open)}
                className="w-10 h-10 rounded-full cursor-pointer border hover:scale-105 transition"
              />
            </div>

            {open &&
              typeof window !== "undefined" &&
              createPortal(
                <div className="fixed top-[70px] right-3 sm:right-6 w-44 max-w-[calc(100vw-24px)] bg-neutral-900 border border-gray-700 shadow-xl rounded-xl p-2 text-sm z-[999999]">
                  <p className="px-2 py-1 text-gray-400 truncate">
                    {session.user?.email}
                  </p>

                  <button
                    onClick={() => router.push("/profile")}
                    className="block w-full text-left px-2 py-2 text-white hover:bg-white/10 rounded"
                  >
                    Profil
                  </button>

                  <button
                    onClick={() => router.push("/profile/plejliste")}
                    className="block w-full text-left px-2 py-2 text-blue-400 hover:bg-white/10 rounded"
                  >
                    Moje playliste
                  </button>

                  <button
                    onClick={() => router.push("/listening-playlist")}
                    className="block w-full text-left px-2 py-2 text-purple-400 hover:bg-white/10 rounded"
                  >
                    Moje playliste za slusanje
                  </button>

                  <button
                    onClick={() => router.push("/favorite")}
                    className="block w-full text-left px-2 py-2 text-yellow-400 hover:bg-white/10 rounded"
                  >
                    Favoriti
                  </button>

                  {session.user?.role === "admin" && (
                    <button
                      onClick={() => router.push("/admin")}
                      className="block w-full text-left px-2 py-2 text-white hover:bg-white/10 rounded"
                    >
                      Admin
                    </button>
                  )}

                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-2 py-2 text-red-400 hover:bg-red-500/10 rounded"
                  >
                    Logout
                  </button>
                </div>,
                document.body
              )}
          </div>
        )}
      </div>
    </nav>
  )
}
