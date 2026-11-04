import { notFound, permanentRedirect } from "next/navigation"
import { isPublicCategory, routePath } from "@/lib/seo/site"

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!isPublicCategory(category)) notFound()
  return permanentRedirect(routePath("biografija", category))
}
