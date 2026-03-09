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

<Link style={{color:"#22c55e"}} href={`/plejliste/${slug}/domace`}>DOMAĆE</Link>

<Link style={{color:"#3b82f6"}} href={`/plejliste/${slug}/strane`}>STRANE</Link>

<Link style={{color:"#f97316"}} href={`/plejliste/${slug}/narodne`}>NARODNE</Link>

</div>

</div>

)

}