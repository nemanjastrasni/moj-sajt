const labels: Record<string, string> = {
  domace: "Zabavne",
  "doma\u0107e": "Zabavne",
  narodne: "Narodne",
  strane: "Strane",
  mix: "Mix",
}

export function getCategoryLabel(category?: string | null): string {
  if (!category) return ""
  return labels[category.trim().toLowerCase()] ?? category
}
