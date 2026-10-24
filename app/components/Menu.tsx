"use client"

import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import Image from "next/image"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useI18n } from "./UiText"

const categories = [
  { href: "/pesme/narodne", label: "Narodne" },
  { href: "/pesme/domace", label: "Zabavne" },
  { href: "/pesme/strane", label: "Strane" },
]
const links = [
  { href: "/", label: "Home" },
  { href: "/pesme", label: "Pesme" },
  { href: "/plejliste", label: "Plejliste" },
  { href: "/akordi", label: "Akordi" },
  { href: "/biografija", label: "Biografija" },
  { href: "/kontakt", label: "Kontakt" },
]

export default function Menu() {
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const id = useId()
  const navigation = useRef<HTMLElement>(null)
  const songsButton = useRef<HTMLButtonElement>(null)
  const accountButton = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [openPesme, setOpenPesme] = useState(false)
  const [online, setOnline] = useState({ total: 0, loggedIn: 0 })
  const close = () => { setOpen(false); setOpenPesme(false) }

  useEffect(() => {
    let disposed = false
    async function heartbeat() {
      try {
        const res = await fetch("/api/online", { method: "POST", credentials: "include", cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!disposed) setOnline({ total: data.total || 0, loggedIn: data.loggedIn || 0 })
      } catch {}
    }
    heartbeat()
    const interval = window.setInterval(heartbeat, 30000)
    const visible = () => { if (document.visibilityState === "visible") heartbeat() }
    document.addEventListener("visibilitychange", visible)
    return () => { disposed = true; window.clearInterval(interval); document.removeEventListener("visibilitychange", visible) }
  }, [session?.user?.id])

  useEffect(() => {
    if (!open && !openPesme) return
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !navigation.current?.contains(event.target)) {
        setOpen(false)
        setOpenPesme(false)
      }
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        setOpenPesme(false)
        if (openPesme) songsButton.current?.focus()
        else accountButton.current?.focus()
      }
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape) }
  }, [open, openPesme])

  const items = session?.user?.role === "admin" ? [...links, { href: "/admin", label: "admin" }] : links
  const current = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")

  return <nav ref={navigation} aria-label={t("Glavni meni")} className="guitar-nav">
    <div className="guitar-links">
      {items.map((item, index) => <div key={item.href} className="guitar-item" style={{ "--step": index } as CSSProperties}>
        {item.href === "/pesme" ? <>
          <button ref={songsButton} type="button" className="guitar-link" data-active={current(item.href) || undefined}
            aria-expanded={openPesme} aria-controls={openPesme ? id + "-categories" : undefined}
            onClick={() => { setOpenPesme(value => !value); setOpen(false) }}>
            {t("Pesme")} <span aria-hidden="true" className="ml-1 text-xs">{openPesme ? "\u25b4" : "\u25be"}</span>
          </button>
          {openPesme && <div id={id + "-categories"} className="guitar-dropdown left-0 top-full mt-1 w-40">
            {categories.map(category => <Link key={category.href} href={category.href} prefetch={false} onClick={close}
              aria-current={current(category.href) ? "page" : undefined} className="guitar-dropdown-link">
              {t(category.label)}
            </Link>)}
          </div>}
        </> : <Link href={item.href} onClick={close} aria-current={current(item.href) ? "page" : undefined} className="guitar-link">
          {t(item.label)}
        </Link>}
      </div>)}
    </div>

    <div className="absolute top-0 right-3 z-30 flex h-[var(--menu-row)] items-center gap-3 sm:right-6">
      <div className="hidden whitespace-nowrap text-xs text-white sm:block" title={t("Korisnici trenutno na sajtu / ulogovani korisnici")}>
        online {online.total} | {t("ulogovani")} {online.loggedIn}
      </div>
      {!session ? <button type="button" disabled={status === "loading"}
        onClick={() => router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash))}
        className="h-[var(--menu-row)] rounded px-3 text-sm text-white hover:bg-black/30 disabled:opacity-60">
        {t(status === "loading" ? "Proveravam..." : "Prijavi se")}
      </button> : <div className="relative flex items-center gap-2">
        {session.user?.name && <span className="hidden max-w-[160px] truncate text-sm text-gray-200 sm:inline">{session.user.name}</span>}
        <button ref={accountButton} type="button" aria-label={t("Korisnicki meni")} aria-expanded={open}
          aria-controls={open ? id + "-account" : undefined} onClick={() => { setOpen(value => !value); setOpenPesme(false) }}
          className="flex h-[var(--menu-row)] w-[var(--menu-row)] items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-sky-400">
          <Image src={session.user?.image || "/avatars/gilmour.png"} width={40} height={40} unoptimized alt="" className="h-7 w-7 rounded-full border border-gray-500 object-cover sm:h-8 sm:w-8" />
        </button>
        {open && <div id={id + "-account"} className="guitar-dropdown right-0 top-full mt-2 w-60 max-w-[calc(100vw-24px)]">
          <p className="truncate px-3 py-2 text-xs text-gray-400">{session.user?.email}</p>
          <Link href="/profile" prefetch={false} onClick={close} className="guitar-dropdown-link">{t("Profil")}</Link>
          <Link href="/predlozi-pesmu" prefetch={false} onClick={close} className="guitar-dropdown-link">{t("Predlozi pesmu")}</Link>
          <Link href="/moji-predlozi" prefetch={false} onClick={close} className="guitar-dropdown-link">{t("Moji predlozi")}</Link>
          <Link href="/profile/plejliste" prefetch={false} onClick={close} className="guitar-dropdown-link">{t("Moje plejliste")}</Link>
          <Link href="/listening-playlist" prefetch={false} onClick={close} className="guitar-dropdown-link">{t("Plejliste za slusanje")}</Link>
          <Link href="/favorite" prefetch={false} onClick={close} className="guitar-dropdown-link">{t("Favoriti")}</Link>
          {session.user?.role === "admin" && <Link href="/admin" prefetch={false} onClick={close} className="guitar-dropdown-link">Admin</Link>}
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="guitar-dropdown-link w-full text-left text-red-300">{t("Odjavi se")}</button>
        </div>}
      </div>}
    </div>
  </nav>
}
