"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Flag, LayoutDashboard, ListMusic, Mic2, Music2, Users } from "lucide-react"
import { useI18n } from "@/app/components/UiText"

const items = [
  { href: "/admin", label: "Pregled", icon: LayoutDashboard },
  { href: "/admin/songs", label: "Pesme", icon: Music2 },
  { href: "/admin/artists", label: "Izvođači", icon: Mic2 },
  { href: "/admin/prijave", label: "Prijave grešaka", icon: Flag },
  { href: "/admin/predlozi", label: "Predlozi pesama", icon: ListMusic },
  { href: "/admin/korisnici", label: "Korisnici", icon: Users },
]
export default function AdminNavigation() {
  const pathname = usePathname()
  const {t}=useI18n()
  return <nav className="admin-navigation" aria-label={t("Administracija")}>
    {items.map(({href,label,icon:Icon}) => <Link key={href} href={href} aria-current={(href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/")) ? "page" : undefined}><Icon aria-hidden="true" /><span>{t(label)}</span></Link>)}
  </nav>
}
