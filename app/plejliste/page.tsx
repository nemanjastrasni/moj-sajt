import Link from "next/link"

export default function PlaylistsPage() {

return (

<div style={{ padding: "40px" }}>

<h1 style={{ fontSize: "28px", marginBottom: "40px", textAlign: "center" }}>
Plejliste
</h1>

<div
style={{
display: "grid",
gridTemplateColumns: "repeat(4, 1fr)",
maxWidth: "900px",
margin: "0 auto",
gap: "40px"
}}
>

<div>
<h3>🎧 Generisane</h3>

<div style={{ display: "grid", gap: "6px" }}>
<Link href="/plejliste/4-akorda">4 akorda</Link>
<Link href="/plejliste/beginner">Beginner gitara</Link>
<Link href="/plejliste/acoustic">Acoustic / unplugged</Link>
</div>

</div>

<div>
<h3>🎸 Žanr</h3>

<div style={{ display: "grid", gap: "6px" }}>
<Link href="/plejliste/rock">Rock</Link>
<Link href="/plejliste/pop">Pop</Link>
<Link href="/plejliste/narodne">Narodne</Link>
<Link href="/plejliste/ex-yu">Ex-Yu</Link>
</div>

</div>

<div>
<h3>⭐ Admin</h3>

<div style={{ display: "grid", gap: "6px" }}>
<Link href="/plejliste/gitarski-klasici">Gitarski klasici</Link>
<Link href="/plejliste/kafanske">Kafanske pesme</Link>
</div>

</div>

<div>
<h3>👤 User</h3>

<div style={{ display: "grid", gap: "6px" }}>
<Link href="/profil/plejliste">Moje plejliste</Link>
<Link href="/plejliste/top-user">Top 20 user playlisti</Link>
<Link href="/plejliste/pesme-koje-znam">Pesme koje mogu da sviram</Link>
</div>

</div>

</div>

</div>

)

}