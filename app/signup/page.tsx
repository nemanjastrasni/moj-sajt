"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const [image, setImage] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [birthYear, setBirthYear] = useState("")

  const avatars = [
    "/avatars/hendrix.png",
    "/avatars/page.png",
    "/avatars/clapton.png",
    "/avatars/srv.png",
    "/avatars/slash.png",
    "/avatars/santana.png",
    "/avatars/knopfler.png",
    "/avatars/bbking.png",
    "/avatars/gilmour.png",
    "/avatars/vanhalen.png",
  ]

  function handleGoogleSignup() {
    signIn("google", {
      callbackUrl: "/",
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Unesi ime.")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Unesi ispravan email.")
      return
    }

    if (password.length < 8) {
      setError("Lozinka mora imati najmanje 8 karaktera.")
      return
    }

    if (password !== confirm) {
      setError("Lozinke se ne poklapaju.")
      return
    }

    setLoading(true)

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        city,
        country,
        birthYear,
        image,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Registracija nije uspela.")
      return
    }

    window.location.href = "/login"
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: "url('/guitar.jpg')" }}
    >
      <div className="flex items-center justify-center bg-gray-100">
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl w-96 max-w-full flex flex-col gap-4"
        >
          <h1 className="text-2xl font-bold text-center text-black">
            Napravi nalog
          </h1>

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-red-600 text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="border border-gray-300 py-2 rounded-lg text-black bg-white hover:bg-gray-50 transition"
          >
            Nastavi preko Google naloga
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="h-px flex-1 bg-gray-300" />
            <span>ili registracija emailom</span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>

          <input
            placeholder="Ime"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black bg-white"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black bg-white"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black bg-white"
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black bg-white"
          />

          <input
            placeholder="Grad"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black bg-white"
          />

          <input
            placeholder="Drzava"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black bg-white"
          />

          <input
            placeholder="Godina rodjenja"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black bg-white"
          />

          <label className="bg-gray-200 text-black px-4 py-2 rounded-lg cursor-pointer text-center block">
            Ubaci profilnu sliku
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return

                const reader = new FileReader()
                reader.onloadend = () => {
                  setImage(reader.result as string)
                  setSelectedAvatar("")
                }
                reader.readAsDataURL(file)
              }}
              className="hidden"
            />
          </label>

          {image && (
            <img
              src={image}
              alt="Izabrana profilna slika"
              className="w-16 h-16 rounded-full mx-auto border mb-2"
            />
          )}

          <p className="text-sm text-gray-500 text-center">ili izaberi avatar</p>

          <div className="grid grid-cols-5 gap-2">
            {avatars.map((avatar) => (
              <img
                key={avatar}
                src={avatar}
                alt="Avatar"
                onClick={() => {
                  setSelectedAvatar(avatar)
                  setImage(avatar)
                }}
                className={`w-12 h-12 rounded-full cursor-pointer border-2 ${
                  selectedAvatar === avatar ? "border-blue-500" : "border-transparent"
                }`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Registrujem..." : "Registruj se"}
          </button>

          <Link href="/login" className="text-sm text-center text-gray-500">
            Vec imas nalog? Login
          </Link>
        </form>
      </div>
    </div>
  )
}
