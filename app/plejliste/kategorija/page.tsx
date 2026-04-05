import Link from "next/link"

export default function PlaylistCategoryPage({ params }: any) {

const { slug } = params

return (

<div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>

<h1 style={{ fontSize: "28px", marginBottom: "30px" }}>
{slug}
</h1>

<div style={{
display:"flex",
gap:"40px",
fontSize:"20px",
marginTop:"20px"
}}>

{slug === "narodne" && (
  <div style={{ display: "flex", gap: "40px", marginTop: "20px" }}>
    <Link href="/plejliste/kafanske">Kafanske</Link>
    <Link href="/plejliste/starogradske">Starogradske</Link>
    <Link href="/plejliste/novije">Novije narodne</Link>
  </div>
)}

{slug === "strane" && (
  <div style={{ display: "flex", gap: "40px", marginTop: "20px" }}>
    <Link href="/plejliste/rock">Rock</Link>
    <Link href="/plejliste/blues">Blues</Link>
    <Link href="/plejliste/jazz">Jazz</Link>
  </div>
)}

{slug === "domace" && (
  <div style={{ display: "flex", gap: "40px", marginTop: "20px" }}>
    <Link href="/plejliste/rock-domace">Rock</Link>
    <Link href="/plejliste/pop">Pop</Link>
    <Link href="/plejliste/novi-talasi">Novi talasi</Link>
  </div>
)}

</div>

</div>

)

}