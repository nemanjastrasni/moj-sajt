import UiText from "@/app/components/UiText"
import Link from "next/link"

export default function PlaylistsPage() {

return (

<div style={{ padding: "40px" }}>

<h1 style={{ fontSize: "28px", marginBottom: "40px", textAlign: "center" }}>
<UiText text="Plejliste" />
</h1>

<div
style={{
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
maxWidth: "1100px",
margin: "0 auto",
gap: "40px"
}}
>

{/* GENERISANE */}

<div>

<h3 style={{
fontSize:"22px",
color:"var(--theme-yellow, #facc15)",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
overflowWrap:"anywhere"
}}>
🎧 <UiText text="Generisane" />
</h3>

<div style={{ display: "grid", gap: "10px" }}>
<Link href="/plejliste/4-akorda"><UiText text="4 akorda" /></Link>
<Link href="/plejliste/beginner"><UiText text="Beginner gitara" /></Link>
<Link href="/plejliste/acoustic">Acoustic / unplugged</Link>
</div>

</div>

{/* ZANR */}

<div>

<h3 style={{
fontSize:"22px",
color:"var(--theme-green, #2cfa15)",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
overflowWrap:"anywhere"
}}>
🎸 <UiText text="Žanr" />
</h3>

<div style={{ display: "grid", gap: "10px" }}>
<Link href="/plejliste/rock">Rock</Link>
<Link href="/plejliste/pop">Pop</Link>
<Link href="/plejliste/narodne"><UiText text="Narodne" /></Link>
<Link href="/plejliste/ex-yu">Ex-Yu</Link>
</div>

</div>

{/* ADMIN */}

<div>

<h3 style={{
fontSize:"22px",
color:"var(--theme-red, #fa1515)",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
overflowWrap:"anywhere"
}}>
⭐ Admin
</h3>

<div style={{ display: "grid", gap: "10px" }}>
<Link href="/plejliste/domace"><UiText text="Zabavne" /></Link>
<Link href="/plejliste/strane"><UiText text="Strane" /></Link>
<Link href="/plejliste/narodne"><UiText text="Narodne" /></Link>
</div>

</div>

{/* USER */}

<div>

<h3 style={{
fontSize:"22px",
color:"var(--theme-blue, #1534fa)",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
overflowWrap:"anywhere"
}}>
👤 <UiText text="User" />
</h3>

<div style={{ display: "grid", gap: "10px" }}>
<Link href="/profile/plejliste"><UiText text="Moje plejliste" /></Link>
<Link href="/top-50/domace">
  <UiText text="Top 50 zabavnih" />
</Link>

<Link href="/top-50/strane">
  <UiText text="Top 50 stranih" />
</Link>

<Link href="/top-50/narodne">
  <UiText text="Top 50 narodnih" />
</Link>
<Link href="/plejliste/pesme-koje-znam"><UiText text="Pesme koje mogu da sviram" /></Link>
</div>

</div>

{/* LISTE ZA SLUSANJE */}

<div>

<h3 style={{
fontSize:"22px",
color:"var(--theme-link, #38bdf8)",
marginBottom:"10px",
display:"flex",
alignItems:"center",
gap:"6px",
overflowWrap:"anywhere"
}}>
🎧 <UiText text="Liste za slušanje" />
</h3>

<div style={{ display:"grid", gap:"10px" }}>
<Link href="/listening-playlist">
<UiText text="Moje plejliste za slušanje" />
</Link>

<Link href="/public-listening-playlists">
  <UiText text="Javne plejliste korisnika" />
</Link>

<Link href="/top-listening-playlists/domace">
<UiText text="20 najslušanijih zabavnih" />
</Link>

<Link href="/top-listening-playlists/strane">
<UiText text="20 najslušanijih stranih" />
</Link>

<Link href="/top-listening-playlists/narodne">
<UiText text="20 najslušanijih narodnih" />
</Link>

<Link href="/top-listening-playlists/mix">
<UiText text="20 najslušanijih Mix plejlisti" />
</Link>

</div>

</div>

</div>

</div>

)

}
