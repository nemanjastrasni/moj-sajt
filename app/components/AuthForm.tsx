"use client"

import { useI18n } from "@/app/components/UiText"
import { signIn, useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { authErrorMessage, safeCallbackUrl, withAuthTimeout } from "@/lib/auth/navigation"
import { AVATARS, isValidEmail, MAX_AVATAR_BYTES, normalizeEmail, validateSignup } from "@/lib/auth/validation"

type Props = { mode: "login" | "signup"; googleEnabled: boolean }
const inputClass = "w-full min-w-0 min-h-11 rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
const buttonClass = "min-h-11 w-full rounded px-3 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-50"

export default function AuthForm({ mode, googleEnabled }: Props) {
  const { t } = useI18n()

  const signup = mode === "signup"
  const router = useRouter()
  const { status } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [image, setImage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [registered, setRegistered] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState("/")
  const [pending, setPending] = useState<"credentials" | "google" | null>(null)
  const submitting = useRef(false)
  const imageRead = useRef(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const callback = safeCallbackUrl(params.get("callbackUrl"), window.location.origin)
    setCallbackUrl(callback)
    const code = params.get("error")
    if (code) setError(authErrorMessage(code))
    setRegistered(!signup && params.get("registered") === "1")
    if (status === "authenticated" && !code) router.replace(callback)
  }, [router, signup, status])

  async function handleGoogle() {
    if (submitting.current || !googleEnabled) return
    submitting.current = true
    setPending("google")
    setError("")
    try {
      await withAuthTimeout(signIn("google", { callbackUrl }))
    } catch {
      setError("Google prijava nije uspela ili traje predugo. Pokusaj ponovo.")
    } finally {
      submitting.current = false
      setPending(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    setError("")
    const normalizedEmail = normalizeEmail(email)
    let data
    if (signup) {
      const input = validateSignup({ name, email: normalizedEmail, password, image, city, country, birthYear })
      if (input.error) return setError(input.error)
      if (password !== confirm) return setError("Lozinke se ne poklapaju.")
      data = input.data
    } else {
      if (!isValidEmail(normalizedEmail)) return setError("Unesi ispravan email.")
      if (!password) return setError("Unesi lozinku.")
    }
    submitting.current = true
    setPending("credentials")
    try {
      if (signup) {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(20000),
        })
        const result = await res.json().catch(() => null)
        if (!res.ok) {
          setError(typeof result?.error === "string" ? result.error : "Registracija nije uspela. Pokusaj ponovo.")
          return
        }
        window.location.assign(`/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`)
      } else {
        const result = await withAuthTimeout(signIn("credentials", {
          email: normalizedEmail, password, redirect: false, callbackUrl,
        }))
        if (!result || result.error || !result.ok) {
          setError(authErrorMessage(result?.error))
          return
        }
        window.location.assign(safeCallbackUrl(result.url || callbackUrl, window.location.origin))
      }
    } catch {
      setError("Zahtev nije zavrsen. Proveri vezu i pokusaj ponovo.")
    } finally {
      submitting.current = false
      setPending(null)
    }
  }

  function selectFile(file?: File) {
    const version = ++imageRead.current
    if (!file) return
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError("Izaberi PNG, JPG, WebP ili GIF sliku.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Profilna slika moze imati najvise 1 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (version === imageRead.current && typeof reader.result === "string") {
        setImage(reader.result)
        setError("")
      }
    }
    reader.onerror = () => { if (version === imageRead.current) setError("Slika nije ucitana. Pokusaj ponovo.") }
    reader.readAsDataURL(file)
  }

  const alternateUrl = `${signup ? "/login" : "/signup"}?callbackUrl=${encodeURIComponent(callbackUrl)}`

  return (
    <section
      className="relative flex min-h-[calc(100svh-16rem)] items-center justify-center bg-cover bg-center px-3 py-10 sm:px-6"
      style={{ backgroundImage: `url('${signup ? "/guitar.jpg" : "/login-bg.png"}')` }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <form onSubmit={handleSubmit} noValidate aria-busy={pending !== null} className="relative z-10 w-full min-w-0 max-w-sm rounded-lg bg-white p-5 text-black shadow-xl sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-bold">{signup ? t("Napravi nalog") : t("Prijavi se")}</h1>
        {registered && !error && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{t("Nalog je napravljen. Sada se prijavi.")}</p>}
        {error && <p role="alert" className="mb-4 break-words rounded bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
        <fieldset disabled={pending !== null} className="flex min-w-0 flex-col gap-4">
          {googleEnabled && <>
            <button type="button" onClick={handleGoogle} className={`${buttonClass} border border-gray-300 bg-white text-black hover:bg-gray-50`}>
              {pending === "google" ? t("Povezujem sa Google nalogom...") : t("Nastavi preko Google naloga")}
            </button>
            <div className="flex items-center gap-3 text-xs text-gray-500" aria-hidden="true">
              <div className="h-px flex-1 bg-gray-200" /><span>{t("ili")}</span><div className="h-px flex-1 bg-gray-200" />
            </div>
          </>}
          {signup && <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="auth-name">
            {t("Ime")}
            <input id="auth-name" name="name" autoComplete="name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </label>}
          <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="auth-email">
            Email
            <input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
          </label>
          <div className="flex flex-col gap-1">
            <label htmlFor="auth-password" className="text-sm font-medium">{t("Lozinka")}</label>
            <input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} aria-describedby={signup ? "password-requirement" : undefined} />
            {signup && <span id="password-requirement" className="text-xs text-gray-500">{t("Najmanje 8 karaktera")}</span>}
            <button type="button" aria-controls={signup ? "auth-password auth-confirm" : "auth-password"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)} className="min-h-11 self-start text-sm text-blue-600 hover:underline">
              {showPassword ? t("Sakrij lozinku") : t("Prikazi lozinku")}
            </button>
          </div>
          {signup && <>
            <label htmlFor="auth-confirm" className="flex flex-col gap-1 text-sm font-medium">
              {t("Potvrdi lozinku")}
              <input id="auth-confirm" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} />
            </label>
            <details className="min-w-0 border-t border-gray-200 pt-3">
              <summary className="min-h-11 cursor-pointer text-sm text-gray-600">{t("Profil (opciono)")}</summary>
              <div className="flex min-w-0 flex-col gap-4 pt-3">
                <label htmlFor="auth-city" className="flex flex-col gap-1 text-sm">{t("Grad")}
                  <input id="auth-city" name="city" autoComplete="address-level2" maxLength={100} value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                </label>
                <label htmlFor="auth-country" className="flex flex-col gap-1 text-sm">{t("Drzava")}
                  <input id="auth-country" name="country" autoComplete="country-name" maxLength={100} value={country} onChange={e => setCountry(e.target.value)} className={inputClass} />
                </label>
                <label htmlFor="auth-birth-year" className="flex flex-col gap-1 text-sm">{t("Godina rodjenja")}
                  <input id="auth-birth-year" name="birthYear" type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} autoComplete="bday-year" value={birthYear} onChange={e => setBirthYear(e.target.value)} className={inputClass} />
                </label>
                <label htmlFor="auth-image" className="flex min-w-0 flex-col gap-2 text-sm">{t("Profilna slika (do 1 MB)")}
                  <input id="auth-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => selectFile(e.target.files?.[0])} className="w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded file:border file:border-gray-300 file:bg-gray-100 file:px-2" />
                </label>
                {image && <Image src={image} width={64} height={64} unoptimized alt={t("Izabrana profilna slika")} className="mx-auto h-16 w-16 rounded-full object-cover" />}
                <div role="radiogroup" aria-label={t("Izaberi avatar")} className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {AVATARS.map(avatar => <label key={avatar} className="aspect-square min-w-0 cursor-pointer rounded-full p-0.5">
                    <input type="radio" name="avatar" value={avatar} checked={image === avatar} aria-label={`Avatar ${avatar.split("/").pop()?.replace(".png", "")}`} onChange={() => { imageRead.current++; setImage(avatar) }} className="peer sr-only" />
                    <Image src={avatar} width={48} height={48} unoptimized alt="" className="h-full w-full rounded-full object-cover peer-checked:ring-2 peer-checked:ring-blue-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600" />
                  </label>)}
                </div>
              </div>
            </details>
          </>}
          <button type="submit" className={`${buttonClass} theme-solid-action bg-black text-white hover:bg-gray-800`}>
            {pending === "credentials" ? (signup ? t("Registrujem...") : t("Ulazim...")) : (signup ? t("Registruj se") : t("Prijavi se"))}
          </button>
        </fieldset>
        <Link href={alternateUrl} className="mt-4 block min-h-11 py-3 text-center text-sm text-blue-600 hover:underline">
          {signup ? t("Vec imas nalog? Prijavi se") : t("Nemas nalog? Registruj se")}
        </Link>
      </form>
    </section>
  )
}
