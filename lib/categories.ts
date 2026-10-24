const labels: Record<string, string> = {
  domace: "Zabavne",
  "doma\u0107e": "Zabavne",
  narodne: "Narodne",
  strane: "Strane",
  mix: "Mix",
}

export function getCategoryLabel(category?: string | null, locale: "sr" | "en" = "sr"): string {
  if (!category) return ""
  const key = category.trim().toLowerCase()
  const english: Record<string, string> = { domace: "Ex-Yu Pop & Rock", "doma\u0107e": "Ex-Yu Pop & Rock", narodne: "Ex-Yu Folk", strane: "International", mix: "Mixed" }
  return (locale === "en" ? english[key] : labels[key]) ?? category
}
