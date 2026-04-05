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
  const [confirmPassword, setConfirmPassword] = useState("")
  const [bio, setBio] = useState(user?.bio || "")
  const [image, setImage] = useState(user?.image || "")
  const [city, setCity] = useState(user?.city || "")
  const [country, setCountry] = useState(user?.country || "")
  const [birthYear, setBirthYear] = useState(user?.birthYear || "")
  const [showPassword, setShowPassword] = useState(false)
  
  async function updateProfile() {
    if (password && password !== confirmPassword) {
    alert("Lozinke se ne poklapaju")
    return
  }
    const res = await fetch("/api/user/update", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    password,
    bio,
    city,
    country,
    birthYear,
    image,
  }),
})

if (!res.ok) {
  alert("Greška pri čuvanju")
  return
}

alert("Sačuvano")
window.location.reload()
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
          className="border px-3 py-2 rounded text-black bg-white"
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Nova lozinka"
          onChange={(e) => setPassword(e.target.value)}
          className="border px-3 py-2 rounded text-black bg-white"
        />
        <button
  type="button"
  onClick={() => setShowPassword(v => !v)}
  className="text-sm text-blue-600"
>
  {showPassword ? "Sakrij" : "Prikaži"} lozinku
</button>
         <input
  type={showPassword ? "text" : "password"}
  placeholder="Potvrdi lozinku"
  onChange={(e) => setConfirmPassword(e.target.value)}
  className="border px-3 py-2 rounded text-black bg-white"
/>
<button
  type="button"
  onClick={() => setShowPassword(v => !v)}
  className="text-sm text-blue-600"
>
  {showPassword ? "Sakrij" : "Prikaži"} lozinku
</button>
    <textarea
  placeholder="Kratko o tebi (bio)"
  value={bio}
  onChange={(e) => setBio(e.target.value)}
  className="border px-3 py-2 rounded text-black"
/>
<input
  value={city}
  onChange={(e) => setCity(e.target.value)}
  placeholder="Grad"
  className="border px-3 py-2 rounded text-black bg-white"
/>

<input
  value={country}
  onChange={(e) => setCountry(e.target.value)}
  placeholder="Država"
  className="border px-3 py-2 rounded text-black bg-white"
/>

<input
  value={birthYear}
  onChange={(e) => setBirthYear(e.target.value)}
  placeholder="Godina rođenja"
  className="border px-3 py-2 rounded text-black bg-white"
/>
{image && (
  <img
    src={image}
    className="w-20 h-20 rounded-full mx-auto border mb-2"
  />
)}
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
        {image && (
  <img
    src={image}
    className="w-20 h-20 rounded-full mx-auto border mb-2"
  />
)}
<label className="bg-blue-600 text-white py-2 rounded text-center cursor-pointer block mt-2">
  Promeni profilnu sliku
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }}
    className="hidden"
  />
</label>
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

                  window.location.reload()
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