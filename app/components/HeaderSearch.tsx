"use client"

import SongSearch from "./SongSearch"
import Link from "next/link"
import BrandLogo from "./BrandLogo"
import { useState } from "react"
export default function HeaderSearch() {
  const [active, setActive] = useState(false)
  return <div className="site-search-bar" data-header-search data-search-active={active}><Link href="/" className="search-header-brand"><BrandLogo /></Link><SongSearch compact mobileCollapsible onActiveChange={setActive} /></div>
}
