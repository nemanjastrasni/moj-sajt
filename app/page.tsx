"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="w-full">

      {/* ADMIN LOGIN */}
      <div className="absolute right-6 top-24 z-20">
        <button
          onClick={() => signIn("github")}
          className="px-4 py-2 bg-black text-white rounded-lg hover:opacity-80"
        >
          Lepi Login
        </button>
      </div>

      {/* HERO */}
      <section
        className="relative h-[520px] flex items-center justify-center text-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=2000)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 max-w-3xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Najveća baza akorda i tekstova pesama
          </h1>

          <p className="text-gray-200 mb-6">
            Pretraži hiljade pesama za gitaru
          </p>

          <Link
            href="/pesme"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Pogledaj pesme
          </Link>
        </div>
      </section>

      {/* KATEGORIJE */}
      <section className="max-w-6xl mx-auto px-6 py-14">

        <h2 className="text-2xl font-bold mb-8 text-white">
          Kategorije
        </h2>

        <div className="grid md:grid-cols-3 gap-6">

          <Link
            href="/pesme/narodne"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <img
              src="https://images.unsplash.com/photo-1501612780327-45045538702b?q=80&w=1600"
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                Narodne
              </span>
            </div>
          </Link>

          <Link
            href="/pesme/domace"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <img
              src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1600"
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                Domaće
              </span>
            </div>
          </Link>

          <Link
            href="/pesme/strane"
            className="relative h-44 rounded-xl overflow-hidden group"
          >
            <img
              src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1600"
              className="absolute w-full h-full object-cover group-hover:scale-110 transition"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                Strane
              </span>
            </div>
          </Link>

        </div>

      </section>

    </main>
  )
}