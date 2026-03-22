"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

export default function SignupPage() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("")
  const [image, setImage] = useState("")

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

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password,
        image
      })
    })

    window.location.href = "/login"
  }

  return (
    <div
  className="min-h-screen flex items-center justify-center bg-cover bg-center"
  style={{ backgroundImage: "url('/guitar.jpg')" }}
>

      {/* LEVA STRANA */}
     
      {/* DESNA STRANA */}
      <div className="flex items-center justify-center bg-gray-100">

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl w-96 flex flex-col gap-4"
        >

          <h1 className="text-2xl font-bold text-center">
            Napravi nalog
          </h1>

          <input
            placeholder="Ime"
            onChange={e => setName(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black"
          />

          <input
            placeholder="Email"
            onChange={e => setEmail(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black"
          />

          <input
            type="password"
            placeholder="Password"
            onChange={e => setPassword(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black"
          />

          <input
            type="password"
            placeholder="Confirm password"
            onChange={e => setConfirm(e.target.value)}
            className="border px-3 py-2 rounded-lg text-black"
          />

          {/* UPLOAD */}
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
          />

          
          {image && (
  <img
    src={image}
    className="w-16 h-16 rounded-full mx-auto border mb-2"
  />
)}
          <p className="text-sm text-gray-500 text-center">
            ili izaberi avatar
          </p>

          {/* AVATAR GRID */}
         <div className="grid grid-cols-5 gap-2">
  {avatars.map((a) => (
   <img
  key={a}
  src={a}
  onClick={() => {
  setSelectedAvatar(a)
  setImage(a)
}}
  className={`w-12 h-12 rounded-full cursor-pointer border-2 ${
    selectedAvatar === a ? "border-blue-500" : "border-transparent"
  }`}
/>
  ))}
</div>

          {error && (
            <p className="text-red-500 text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="bg-black text-white py-2 rounded-lg"
          >
            Registruj se
          </button>

          <button
            type="button"
            onClick={() => signIn("google")}
            className="border py-2 rounded-lg"
          >
            Continue with Google
          </button>

          <a href="/login" className="text-sm text-center text-gray-500">
            Već imaš nalog? Login
          </a>

        </form>
      </div>
    </div>
  )
}