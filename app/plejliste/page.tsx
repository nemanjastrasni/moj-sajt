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
gridTemplateColumns: "repeat(5, 1fr)",
maxWidth: "1100px",
margin: "0 auto",
gap: "40px"
}}
>

{/* GENERISANE */}

<div>

<h3 style={{
fontSize:"22px",
color:"#facc15",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
whiteSpace:"nowrap"
}}>
🎧 Generisane
</h3>

<div style={{ display: "grid", gap: "10px" }}>
<Link href="/plejliste/4-akorda">4 akorda</Link>
<Link href="/plejliste/beginner">Beginner gitara</Link>
<Link href="/plejliste/acoustic">Acoustic / unplugged</Link>
</div>

</div>

{/* ZANR */}

<div>

<h3 style={{
fontSize:"22px",
color:"#2cfa15",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
whiteSpace:"nowrap"
}}>
🎸 Žanr
</h3>

<div style={{ display: "grid", gap: "10px" }}>
<Link href="/plejliste/rock">Rock</Link>
<Link href="/plejliste/pop">Pop</Link>
<Link href="/plejliste/narodne">Narodne</Link>
<Link href="/plejliste/ex-yu">Ex-Yu</Link>
</div>

</div>

{/* ADMIN */}

<div>

<h3 style={{
fontSize:"22px",
color:"#fa1515",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
whiteSpace:"nowrap"
}}>
⭐ Admin
</h3>

<div style={{ display: "grid", gap: "10px" }}>
<Link href="/plejliste/domace">Domaće</Link>
<Link href="/plejliste/strane">Strane</Link>
<Link href="/plejliste/narodne">Narodne</Link>
</div>

</div>

{/* USER */}

<div>

<h3 style={{
fontSize:"22px",
color:"#1534fa",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
whiteSpace:"nowrap"
}}>
👤 User
</h3>

<div style={{ display: "grid", gap: "10px" }}>
<Link href="/profile/plejliste">Moje plejliste</Link>
<Link href="/plejliste/top-user">Top 20 user playlisti</Link>
<Link href="/plejliste/pesme-koje-znam">Pesme koje mogu da sviram</Link>
</div>

</div>

{/* LISTE ZA SLUSANJE */}

<div>

<h3 style={{
fontSize:"22px",
color:"#38bdf8",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
whiteSpace:"nowrap"
}}>
🎧 Liste za slušanje
</h3>

<div style={{ display:"grid", gap:"10px" }}>

<Link href="/plejliste/slusanje-domace">
20 najslušanijih domaćih
</Link>

<Link href="/plejliste/slusanje-strane">
20 najslušanijih stranih
</Link>

<Link href="/plejliste/slusanje-narodne">
20 najslušanijih narodnih
</Link>

</div>

</div>

</div>

</div>

)

}