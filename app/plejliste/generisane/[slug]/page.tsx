import { notFound, redirect } from "next/navigation"
import { catalogEntry } from "@/lib/playlists/catalog"
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!catalogEntry(slug)) notFound()
  redirect("/plejliste/" + slug)
}
