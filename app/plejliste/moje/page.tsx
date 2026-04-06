import Link from "next/link"

export default function Page() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Moje playliste</h1>

      <Link href="/profile/plejliste">
        Idi na moje playliste
      </Link>
    </div>
  )
}