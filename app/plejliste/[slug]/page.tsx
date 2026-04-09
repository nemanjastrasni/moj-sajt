import { notFound } from "next/navigation"

export default function PlaylistPage({ params }: any) {
  const { slug } = params

  if (!slug) return notFound()

  return (
    <div style={{ padding: "40px" }}>
      <h1>{slug}</h1>
      <p>Playlista: {slug}</p>
    </div>
  )
}