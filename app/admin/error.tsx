"use client"
import Link from "next/link"
import { RefreshCw } from "lucide-react"

export default function AdminError({reset}:{reset:()=>void}) {
  return <section className="admin-page" role="alert">
    <h1>Prikaz trenutno nije dostupan</h1>
    <p className="admin-muted mb-6">Proveri vezu i pokušaj ponovo. Pre ponavljanja unosa ili brisanja proveri da li je prethodna izmena sačuvana.</p>
    <div className="admin-row-actions"><button type="button" className="ui-button" onClick={reset}><RefreshCw aria-hidden="true" />Pokušaj ponovo</button><Link href="/" className="ui-button">Početna</Link></div>
  </section>
}
