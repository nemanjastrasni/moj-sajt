import { redirect } from "next/navigation"

export default async function LegacySongEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect("/admin/songs/" + encodeURIComponent(id) + "/edit")
}
