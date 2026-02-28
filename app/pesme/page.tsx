import Link from "next/link"

export default function PesmeRootPage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Izaberi kategoriju</h1>

      <ul>
        <li><Link href="/pesme/domace">Domaće</Link></li>
        <li><Link href="/pesme/strane">Strane</Link></li>
        <li><Link href="/pesme/narodne">Narodne</Link></li>
      </ul>
    </div>
  )
}