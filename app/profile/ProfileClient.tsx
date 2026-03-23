"use client"

import { useState } from "react"

const avatars = [
  "/avatars/hendrix.png",
  "/avatars/page.png",
  "/avatars/clapton.png",
  "/avatars/gilmour.png",
  "/avatars/knopfler.png",
]

export default function ProfileClient({ user, favorites }: any) {
  const [name, setName] = useState(user?.name || "")
  const [password, setPassword] = useState("")
  const [image, setImage] = useState(user?.image || "")

  async function updateProfile() {
    await fetch("/api/user/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        password,
        image
      })
    })

    alert("Sačuvano")
    location.reload()
  }

  return (
    <div className="p-10 max-w-xl mx-auto">
      
      <h1 className="text-3xl font-bold mb-4">Profil</h1>

      <p><b>Ime:</b> {user?.name}</p>
      <p><b>Email:</b> {user?.email}</p>
      <p><b>Bio:</b> {user?.bio || "Nema"}</p>

      <div className="mt-6 flex flex-col gap-3 max-w-sm">

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Novo ime"
          className="border px-3 py-2 rounded text-black"
        />

        <input
          type="password"
          placeholder="Nova lozinka"
          onChange={(e) => setPassword(e.target.value)}
          className="border px-3 py-2 rounded text-black"
        />

        <div className="grid grid-cols-5 gap-2">
          {avatars.map((a) => (
            <img
              key={a}
              src={a}
              onClick={() => setImage(a)}
              className={`w-10 h-10 rounded-full cursor-pointer border-2 ${
                image === a ? "border-blue-500" : "border-transparent"
              }`}
            />
          ))}
        </div>

        <button
          onClick={updateProfile}
          className="bg-blue-600 text-white py-2 rounded"
        >
          Sačuvaj izmene
        </button>

        {/* FAVORITES */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-3">⭐ Favorites</h2>

          {favorites?.length === 0 && (
            <p className="text-gray-500">Nema favorita</p>
          )}

          {favorites?.map((f: any) => (
            <div key={f.id} className="mb-2 flex items-center justify-between">
              
              <a
                href={`/pesme/${f.song.category}/${f.song.artistSlug}/${f.song.slug}`}
                className="text-blue-600 hover:underline"
              >
                {f.song.title}
              </a>

              <button
                onClick={async () => {
                  await fetch("/api/favorite", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ songId: f.song.id }),
                  })

                  location.reload()
                }}
                className="text-red-500 ml-4"
              >
                ❌
              </button>

            </div>
          ))}
        </div>

      </div>
    </div>
  )
}