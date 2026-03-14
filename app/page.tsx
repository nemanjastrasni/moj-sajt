"use client"

import { signIn } from "next-auth/react"

export default function HomePage() {
  return (
    <main className="p-20">

      {/* ADMIN LOGIN */}
      <div className="absolute right-6 top-24">
        <button
          onClick={() => signIn("github")}
          className="px-4 py-2 bg-black text-white rounded-lg hover:opacity-80"
        >
          Admin Login (GitHub)
        </button>
      </div>

      {/* sadržaj homepage-a */}
    </main>
  )
}