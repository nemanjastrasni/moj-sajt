import Link from "next/link"

export default function PlaylistsPage() {

return (
<div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>

<h1 style={{ fontSize: "28px", marginBottom: "30px" }}>
Plejliste
</h1>

<div style={{ display: "grid", gap: "30px" }}>

<div>
<h2>🎧 Generisane</h2>
<ul>
<li><Link href="/playliste/4-akorda">4 akorda</Link></li>
<li><Link href="/playliste/beginner">Beginner gitara</Link></li>
<li><Link href="/playliste/acoustic">Acoustic / unplugged</Link></li>
</ul>
</div>

<div>
<h2>🎸 Žanr</h2>
<ul>
<li><Link href="/playliste/rock">Rock</Link></li>
<li><Link href="/playliste/pop">Pop</Link></li>
<li><Link href="/playliste/narodne">Narodne</Link></li>
<li><Link href="/playliste/ex-yu">Ex-Yu</Link></li>
</ul>
</div>

<div>
<h2>⭐ Admin</h2>
<ul>
<li><Link href="/playliste/gitarski-klasici">Gitarski klasici</Link></li>
<li><Link href="/playliste/kafanske">Kafanske pesme</Link></li>
</ul>
</div>

<div>
<h2>👤 User</h2>
<ul>
<li><Link href="/profil/playliste">Moje plejliste</Link></li>
<li><Link href="/playliste/top-user">Top 20 user playlisti</Link></li>
<li><Link href="/playliste/pesme-koje-znam">Pesme koje mogu da sviram</Link></li>
</ul>
</div>

</div>
</div>
)}