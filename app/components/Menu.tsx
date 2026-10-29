"use client"

import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import Image from "next/image"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import type { Session } from "next-auth"
import { BookOpen, ClipboardList, FilePlus2, Guitar, Headphones, Heart, House, ListMusic, LogIn, LogOut, Mail, Menu as MenuIcon, Music2, Shield, UserRound, X } from "lucide-react"
import { useI18n } from "./UiText"
import { PRESENCE_EVENT, validCounts, type PresenceCounts } from "@/lib/presence/model"
import BackButton from "./BackButton"
import ThemeToggle from "./ThemeToggle"
import LanguageSelect from "./LanguageSelect"
import TunerButton from "./TunerButton"
import MetronomeButton from "./MetronomeButton"

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
const mobileIcons = { Home: House, Pesme: Music2, Plejliste: ListMusic, Akordi: Guitar, Biografija: BookOpen, Kontakt: Mail, admin: Shield }
const accountLinks = [
  { href: "/profile", label: "Profil", icon: UserRound },
  { href: "/profile/plejliste", label: "Moje plejliste", icon: ListMusic },
  { href: "/favorite", label: "Favoriti", icon: Heart },
  { href: "/listening-playlist", label: "Moja muzika", icon: Headphones },
  { href: "/predlozi-pesmu", label: "Predlozi pesmu", icon: FilePlus2 },
  { href: "/moji-predlozi", label: "Moji predlozi", icon: ClipboardList },
]

export default function Menu() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [online, setOnline] = useState<PresenceCounts | null>(null)

  useEffect(() => {
    if (status === "loading") return
    let disposed = false
    let running: AbortController | null = null
    const accept = (data: unknown) => { if (validCounts(data) && !disposed) setOnline(current => !current || Date.parse(data.checkedAt) >= Date.parse(current.checkedAt) ? data : current) }
    const update = (event: Event) => accept((event as CustomEvent).detail)
    async function heartbeat() {
      if (running || document.visibilityState === "hidden") return
      const controller = new AbortController(); running = controller
      const deadline = window.setTimeout(() => controller.abort(), 10000)
      try {
        const res = await fetch("/api/online", { method: "POST", credentials: "include", cache: "no-store", signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()
        if (!controller.signal.aborted) accept(data)
      } catch {}
      finally { window.clearTimeout(deadline); if (running === controller) running = null }
    }
    heartbeat()
    const interval = window.setInterval(heartbeat, 30000)
    const visible = () => { if (document.visibilityState === "visible") heartbeat() }
    document.addEventListener("visibilitychange", visible)
    window.addEventListener(PRESENCE_EVENT, update)
    return () => { disposed = true; running?.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", visible); window.removeEventListener(PRESENCE_EVENT, update) }
  }, [session?.user?.id, status])

  return <HeaderNavigation key={pathname} session={session} status={status} pathname={pathname} online={online} />
}

function HeaderNavigation({ session, status, pathname, online }: {
  session: Session | null; status: "loading" | "authenticated" | "unauthenticated"; pathname: string; online: PresenceCounts | null
}) {
  const { t } = useI18n(), router = useRouter(), id = useId()
  const navigation = useRef<HTMLDivElement>(null)
  const songsButton = useRef<HTMLButtonElement>(null), accountButton = useRef<HTMLButtonElement>(null), mobileButton = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false), [openPesme, setOpenPesme] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [metronomePlaying, setMetronomePlaying] = useState(false)
  const close = () => { setOpen(false); setOpenPesme(false); setMobileOpen(false) }
  const login = () => router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash))

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const reset = () => { setOpen(false); setOpenPesme(false); setMobileOpen(false) }
    media.addEventListener("change", reset)
    return () => media.removeEventListener("change", reset)
  }, [])

  useEffect(() => {
    if (!open && !openPesme && !mobileOpen) return
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !navigation.current?.contains(event.target) && !document.querySelector("dialog[open]")) {
        setOpen(false)
        setOpenPesme(false)
        setMobileOpen(false)
      }
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented && !(event.target instanceof Element && event.target.closest("dialog[open]"))) {
        setOpen(false)
        setOpenPesme(false)
        setMobileOpen(false)
        if (mobileOpen) mobileButton.current?.focus()
        else if (openPesme) songsButton.current?.focus()
        else accountButton.current?.focus()
      }
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape) }
  }, [open, openPesme, mobileOpen])

  const items = session?.user?.role === "admin" ? [...links, { href: "/admin", label: "admin" }] : links
  const current = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")

  return <div ref={navigation} className="responsive-header">
    <div className="guitar-nav mobile-guitar-bar">
      <BackButton compact />
      <Link href="/" className="mobile-header-brand" onClick={close}>GitaraAkordi</Link>
      <div className="mobile-header-buttons">
        <button ref={mobileButton} type="button" className="mobile-header-icon" data-playing={metronomePlaying} title={t(mobileOpen ? "Zatvori meni" : "Otvori meni") + (metronomePlaying ? ` · ${t("Metronom radi")}` : "")} aria-label={t(mobileOpen ? "Zatvori meni" : "Otvori meni") + (metronomePlaying ? ` · ${t("Metronom radi")}` : "")} aria-expanded={mobileOpen} aria-controls={id + "-mobile"} onClick={() => { setMobileOpen(value => !value); setOpen(false); setOpenPesme(false) }}>{mobileOpen ? <X aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}</button>
      </div>
    </div>
    <nav aria-label={t("Glavni meni")} className="guitar-nav desktop-guitar-nav">
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
        online {online?.total ?? "-"} | {t("ulogovani")} {online?.loggedIn ?? "-"} | {t("Gosti")} {online?.guests ?? "-"}
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
          <Link href="/listening-playlist" prefetch={false} onClick={close} className="guitar-dropdown-link">{t("Moja muzika")}</Link>
          <Link href="/favorite" prefetch={false} onClick={close} className="guitar-dropdown-link">{t("Favoriti")}</Link>
          {session.user?.role === "admin" && <Link href="/admin" prefetch={false} onClick={close} className="guitar-dropdown-link">Admin</Link>}
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="guitar-dropdown-link w-full text-left text-red-300">{t("Odjavi se")}</button>
        </div>}
      </div>}
    </div>
    </nav>
    {/* Keep one controls tree mounted when the mobile disclosure collapses. */}
    <div id={id + "-mobile"} className="header-panel" data-open={mobileOpen}>
      <div className="mobile-menu-content">
        <nav aria-label={t("Glavni meni")}>
          <div className="mobile-menu-grid">
            {items.map(item => {
              const Icon = mobileIcons[item.label as keyof typeof mobileIcons]
              return <Link key={item.href} href={item.href} prefetch={false} onClick={close} className="mobile-menu-link" aria-current={current(item.href) ? "page" : undefined}><Icon aria-hidden="true" /><span>{t(item.label)}</span></Link>
            })}
          </div>
          <div className="mobile-menu-categories">
            {categories.map(category => <Link key={category.href} href={category.href} prefetch={false} onClick={close} className="mobile-menu-link" aria-current={current(category.href) ? "page" : undefined}>{t(category.label)}</Link>)}
          </div>
        </nav>
        <section className="mobile-account" aria-labelledby={id + "-account-heading"}>
          <h2 id={id + "-account-heading"}>{t("Korisnicki meni")}</h2>
          {!session ? <button type="button" className="mobile-menu-link" disabled={status === "loading"} onClick={login}><LogIn aria-hidden="true" /><span>{t(status === "loading" ? "Proveravam..." : "Prijavi se")}</span></button> : <>
            <p className="mobile-account-name">{session.user?.name}</p>
            <p className="mobile-account-email">{session.user?.email}</p>
            <div className="mobile-menu-grid">{accountLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch={false} className="mobile-menu-link" onClick={close}><Icon aria-hidden="true" /><span>{t(label)}</span></Link>)}</div>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="mobile-menu-link mobile-logout"><LogOut aria-hidden="true" /><span>{t("Odjavi se")}</span></button>
          </>}
        </section>
        <p className="mobile-presence">online {online?.total ?? "-"} · {t("ulogovani")} {online?.loggedIn ?? "-"} · {t("Gosti")} {online?.guests ?? "-"}</p>
      </div>
      <div className="header-controls flex min-h-12 flex-wrap items-center justify-between gap-x-3 px-3 pb-1 sm:px-6">
        <div className="desktop-header-back"><BackButton /></div>
        <h2 className="mobile-tools-heading">{t("Alati i podesavanja")}</h2>
        <div className="header-tool-buttons ml-auto flex flex-wrap items-center justify-end gap-1"><TunerButton /><MetronomeButton onPlayingChange={setMetronomePlaying} /><ThemeToggle /><LanguageSelect /></div>
      </div>
    </div>
  </div>
}
