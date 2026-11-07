"use client"

import SongSearch from "./SongSearch"
import Link from "next/link"
import BrandLogo from "./BrandLogo"
export default function HeaderSearch() {
  return <div className="site-search-bar" data-header-search><Link href="/" className="search-header-brand"><BrandLogo /></Link><SongSearch compact /></div>
}
