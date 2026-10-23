"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { withAuthTimeout } from "@/lib/auth/navigation"

export default function GoogleAccountLink({ linked }: { linked: boolean }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function linkAccount() {
    if (pending) return
    setPending(true)
    setError("")
    try {
      await withAuthTimeout(signIn("google", { callbackUrl: "/profile" }))
    } catch {
      setError("Povezivanje nije uspelo. Pokusaj ponovo.")
    } finally {
      setPending(false)
    }
  }

  if (linked) return <p className="my-4 text-sm text-green-400">Google nalog je povezan.</p>
  return <div className="my-4">
    <button type="button" onClick={linkAccount} disabled={pending} className="min-h-11 rounded border border-gray-500 px-4 py-2 text-sm disabled:opacity-50">
      {pending ? "Povezujem..." : "Povezi Google nalog"}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
  </div>
}
