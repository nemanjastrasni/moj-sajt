"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const handleSubmit = async (e: any) => {
  e.preventDefault()

  if (password !== confirm) {
    setError("Passwords do not match")
    return
  }

  await fetch("/api/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  })

  window.location.href = "/login"
}
{error && <p className="text-red-500">{error}</p>}
  const handleSignup = async () => {
    await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    })

    window.location.href = "/login"
  }

  return (
  <div className="min-h-screen grid grid-cols-2">

    {/* LEVA STRANA */}
    <div className="hidden md:flex items-center justify-center bg-cover bg-center"
     style={{ backgroundImage: "url('/guitar.jpg')" }}></div>
    <div className="hidden md:flex items-center justify-center bg-black text-white p-10">
      <div>
        <h1 className="text-4xl font-bold mb-4">
          GitaraAkordi
        </h1>
        <p className="text-gray-300">
          Najveća baza akorda i pesama na Balkanu.
        </p>
      </div>
    </div>

    {/* DESNA STRANA */}
    <div className="flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 flex flex-col gap-4">

        <h1 className="text-2xl font-bold text-center">
          Napravi nalog
        </h1>

        <input
          placeholder="Ime"
          onChange={e => setName(e.target.value)}
          className="border px-3 py-2 rounded-lg text-black focus:ring-2 focus:ring-black"
        />

        <input
          placeholder="Email"
          onChange={e => setEmail(e.target.value)}
          className="border px-3 py-2 rounded-lg text-black focus:ring-2 focus:ring-black"
        />

        <input
          type="password"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
          className="border px-3 py-2 rounded-lg text-black focus:ring-2 focus:ring-black"
        />

        <input
          type="password"
          placeholder="Confirm password"
          onChange={e => setConfirm(e.target.value)}
          className="border px-3 py-2 rounded-lg text-black focus:ring-2 focus:ring-black"
        />

        {error && (
          <p className="text-red-500 text-sm text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          className="bg-black text-white py-2 rounded-lg"
        >
          Registruj se
        </button>

        <button
          onClick={() => signIn("google")}
          className="border py-2 rounded-lg"
        >
          Continue with Google
        </button>

        <a href="/login" className="text-sm text-center text-gray-500">
          Već imaš nalog? Login
        </a>

      </div>
    </div>
  </div>
)
}