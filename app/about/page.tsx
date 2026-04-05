"use client"

import { useSession } from "next-auth/react"

export default function AboutPage() {
  const { data: session } = useSession()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">About</h1>

      {session && (
        <p className="mt-2">
          Ulogovan kao: <b>{session.user?.name}</b>
        </p>
      )}

      {session?.user?.role === "admin" && (
        <div className="mt-6 p-4 border rounded bg-green-100">
          <h2 className="font-bold text-green-800">ADMIN PANEL</h2>
          <p>Ovo vidi samo admin</p>
        </div>
      )}
    </div>
  )
}