import { redirect } from "next/navigation"

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  return redirect(`/biografija/${encodeURIComponent(category)}`)
}
