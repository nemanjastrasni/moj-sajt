export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // skida dijakritike
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export function createSongId(
  artistFull: string,
  title: string
): string {
  return `${slugify(artistFull)}-${slugify(title)}`
}
