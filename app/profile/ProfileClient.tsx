"use client"

import { useI18n } from "@/app/components/UiText"
import { useState } from "react"

const avatars = [
  "/avatars/hendrix.png",
  "/avatars/page.png",
  "/avatars/clapton.png",
  "/avatars/gilmour.png",
  "/avatars/knopfler.png",
]

export default function ProfileClient({ user, favorites }: any) {
  const { t } = useI18n()

  const [name, setName] = useState(user?.name || "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [bio, setBio] = useState(user?.bio || "")
  const [birthDay, setBirthDay] = useState(user?.birthDay || "")
  const [birthMonth, setBirthMonth] = useState(user?.birthMonth || "")
  const [image, setImage] = useState(user?.image || "")
  const [city, setCity] = useState(user?.city || "")
  const [country, setCountry] = useState(user?.country || "")
  const [birthYear, setBirthYear] = useState(user?.birthYear || "")
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [skillLevel, setSkillLevel] = useState(
  user?.skillLevel || "beginner"
)
  async function updateProfile() {
    if (password && password !== confirmPassword) {
    alert(t("Lozinke se ne poklapaju"))
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
    birthDay,
    birthMonth,
    birthYear,
    image,
    skillLevel,
  }),
})

if (!res.ok) {
  alert(t("Greška pri čuvanju"))
  return
}

setSuccess(true)
  }

  return (
    <div className="min-w-0 p-4 sm:p-10 max-w-xl mx-auto">
      
      <h1 className="text-3xl font-bold mb-4">{t("Profil")}</h1>

      <p><b>{t("Ime")}:</b> {user?.name}</p>
      <p><b>Email:</b> {user?.email}</p>
      <p><b>Bio:</b> {user?.bio || t("Nema")}</p>

      <div className="mt-6 flex flex-col gap-3 max-w-sm">

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("Novo ime")}
          className="border px-3 py-2 rounded text-black bg-white"
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder={t("Nova lozinka")}
          onChange={(e) => setPassword(e.target.value)}
          className="border px-3 py-2 rounded text-black bg-white"
        />
        <button
  type="button"
  onClick={() => setShowPassword(v => !v)}
  className="text-sm text-blue-600"
>
  {t(showPassword ? "Sakrij lozinku" : "Prikazi lozinku")}
</button>
         <input
  type={showPassword ? "text" : "password"}
  placeholder={t("Potvrdi lozinku")}
  onChange={(e) => setConfirmPassword(e.target.value)}
  className="border px-3 py-2 rounded text-black bg-white"
/>
<button
  type="button"
  onClick={() => setShowPassword(v => !v)}
  className="text-sm text-blue-600"
>
  {t(showPassword ? "Sakrij lozinku" : "Prikazi lozinku")}
</button>
    <textarea
  placeholder={t("Kratko o tebi (bio)")}
  value={bio}
  onChange={(e) => setBio(e.target.value)}
  className="border px-3 py-2 rounded text-black bg-white"
/>
<input
  value={city}
  onChange={(e) => setCity(e.target.value)}
  placeholder={t("Grad")}
  className="border px-3 py-2 rounded text-black bg-white"
/>

<input
  value={country}
  onChange={(e) => setCountry(e.target.value)}
  placeholder={t("Država")}
  className="border px-3 py-2 rounded text-black bg-white"
/>
<div className="grid grid-cols-3 gap-2">

  <select
    value={birthDay}
    onChange={(e) => setBirthDay(Number(e.target.value))}
    className="border px-3 py-2 rounded text-black bg-white"
  >
    <option value="">{t("Dan")}</option>
    {Array.from({ length: 31 }, (_, i) => (
      <option key={i + 1} value={i + 1}>
        {i + 1}
      </option>
    ))}
  </select>

  <select
    value={birthMonth}
    onChange={(e) => setBirthMonth(Number(e.target.value))}
    className="border px-3 py-2 rounded text-black bg-white"
  >
    <option value="">{t("Mesec")}</option>
    {Array.from({ length: 12 }, (_, i) => (
      <option key={i + 1} value={i + 1}>
        {i + 1}
      </option>
    ))}
  </select>

  <select
    value={birthYear}
    onChange={(e) => setBirthYear(Number(e.target.value))}
    className="border px-3 py-2 rounded text-black bg-white"
  >
    <option value="">{t("Godina")}</option>

    {Array.from(
      { length: new Date().getFullYear() - 1899 },
      (_, i) => {
        const year = new Date().getFullYear() - i

        return (
          <option key={year} value={year}>
            {year}
          </option>
        )
      }
    )}
  </select>

</div>

{image && (
  <img
    src={image}
    className="w-20 h-20 rounded-full mx-auto border mb-2"
  />
)}
<select
  value={skillLevel}
  onChange={(e) => setSkillLevel(e.target.value)}
  className="border px-3 py-2 rounded text-black bg-white"
>
  <option value="beginner">Beginner</option>
  <option value="intermediate">Intermediate</option>
  <option value="advanced">Advanced</option>
</select>
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
  {t("Promeni profilnu sliku")}
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const img = new Image()
  const reader = new FileReader()

  reader.onload = (event) => {
    img.src = event.target?.result as string
  }

  img.onload = () => {
    const canvas = document.createElement("canvas")

    const SIZE = 200

    canvas.width = SIZE
    canvas.height = SIZE

    const ctx = canvas.getContext("2d")

    ctx?.drawImage(img, 0, 0, SIZE, SIZE)

    const compressed = canvas.toDataURL(
      "image/jpeg",
      0.7
    )

    setImage(compressed)
  }

  reader.readAsDataURL(file)
}}
    className="hidden"
  />
</label>
        {success && (
  <p className="text-green-500 text-center">
    ✓ {t("Profil uspešno sačuvan")}
  </p>
)}

        <button
          onClick={updateProfile}
          className="bg-blue-600 text-white py-2 rounded"
        >
          {t("Sačuvaj izmene")}
        </button>

        {/* FAVORITES */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-3">⭐ {t("Favoriti")}</h2>

          {favorites?.length === 0 && (
            <p className="text-gray-500">{t("Nema favorita")}</p>
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
