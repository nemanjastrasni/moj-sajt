"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError("")

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Unesi ispravan email.")
      return
    }

    if (!password) {
      setError("Unesi lozinku.")
      return
    }

    setLoading(true)

    try {
      const callbackUrl =
        new URLSearchParams(window.location.search).get("callbackUrl") || "/"

      const result = await signIn("credentials", {
  email,
  password,
  redirect: false,
  callbackUrl,
})


      if (!result || result.error) {
        setError("Email ili lozinka nisu ispravni.")
        return
      }

      router.push(result.url || callbackUrl)
      router.refresh()
    } catch {
      setError("Login trenutno nije uspeo. Probaj ponovo.")
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    const callbackUrl =
      new URLSearchParams(window.location.search).get("callbackUrl") || "/"

    signIn("google", {
      callbackUrl,
    })
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-80 flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-center text-black">Login</h1>

          {error && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="border border-gray-300 py-2 rounded text-black bg-white hover:bg-gray-50 transition"
          >
            Nastavi preko Google naloga
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="h-px flex-1 bg-gray-200" />
            <span>ili</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border px-3 py-2 rounded text-black bg-white"
          />

          <div className="flex flex-col gap-1">
            <input
              type={show ? "text" : "password"}
              placeholder="Lozinka"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border px-3 py-2 rounded text-black bg-white"
            />

            <button
              type="button"
              onClick={() => setShow(!show)}
              className="text-sm text-blue-500 text-left"
            >
              {show ? "Sakrij" : "Prikazi"} lozinku
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="bg-black text-white py-2 rounded z-50 relative disabled:opacity-50"
          >
            {loading ? "Ulazim..." : "Login"}
          </button>

          <Link href="/signup" className="text-sm text-blue-500 text-center">
            Nemas nalog? Signup
          </Link>
        </div>
      </div>
    </div>
  )
}
