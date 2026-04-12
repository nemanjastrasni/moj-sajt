import Link from "next/link"

export default function GeneratedPlaylistsPage() {

return (

<div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>

<h1 style={{ fontSize: "28px", marginBottom: "30px" }}>
Generisane playliste
</h1>

<div style={{ display: "grid", gap: "12px" }}>

<Link href="/plejliste/generisane/4-akorda">
4 akorda
</Link>

<Link href="/plejliste/generisane/beginner">
Beginner gitara
</Link>

<Link href="/plejliste/generisane/acoustic">
Acoustic
</Link>

</div>

</div>

)

}