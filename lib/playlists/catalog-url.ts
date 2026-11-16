import { isPublicCategory } from "../seo/site"

export function catalogBrowseHref(slug: string, page = 1, category?: string) {
  const query = new URLSearchParams()
  if (Number.isSafeInteger(page) && page > 1) query.set("page", String(page))
  if (category && isPublicCategory(category)) query.set("category", category)
  const suffix = query.toString()
  return "/plejliste/" + encodeURIComponent(slug) + (suffix ? "?" + suffix : "")
}
