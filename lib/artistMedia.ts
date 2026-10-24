export function safeArtistImage(value: string | null | undefined): string | null {
  const image = value?.trim()
  if (!image || /[\\\u0000-\u001f]/.test(image)) return null
  if (image.startsWith("/") && !image.startsWith("//")) return image
  try {
    const url = new URL(image)
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function artistInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase() || "?"
}
