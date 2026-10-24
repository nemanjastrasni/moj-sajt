import type { Prisma } from "@prisma/client"
export const ADMIN_PAGE_SIZE = 20
export const adminLetters = ["#", "A", "B", "C", "\u010c", "\u0106", "D", "D\u017d", "\u0110", "E", "F", "G", "H", "I", "J", "K", "L", "LJ", "M", "N", "NJ", "O", "P", "Q", "R", "S", "\u0160", "T", "U", "V", "W", "X", "Y", "Z", "\u017d"]
export type AdminSongFilters = { q: string; artist: string; category: string; letter: string; sort: string; page: number }
export type AdminSearchParams = Record<string, string | string[] | undefined>
const scalar = (value: string | string[] | undefined) => typeof value === "string" ? value : ""
export function adminSongFilters(params: AdminSearchParams): AdminSongFilters {
  const page = scalar(params.page)
  const category = scalar(params.category)
  const letter = scalar(params.letter || params.artistLetter).toUpperCase()
  return { q: scalar(params.q).trim().slice(0, 120), artist: scalar(params.artist).trim().slice(0, 200),
    category: ["domace", "narodne", "strane"].includes(category) ? category : "",
    letter: adminLetters.includes(letter) ? letter : "", sort: ["title", "artist"].includes(scalar(params.sort)) ? scalar(params.sort) : "latest",
    page: /^[1-9]\d{0,7}$/.test(page) ? Number(page) : 1 }
}
export const escapeAdminLike = (value: string) => value.replace(/[\\%_]/g, "\\$&")
export function adminSongWhere(filters: AdminSongFilters): Prisma.SongWhereInput {
  const and: Prisma.SongWhereInput[] = []
  if (filters.q) and.push({ OR: [{ title: { contains: escapeAdminLike(filters.q), mode: "insensitive" } }, { artist: { name: { contains: escapeAdminLike(filters.q), mode: "insensitive" } } }] })
  if (filters.artist) and.push({ artist: { name: { contains: escapeAdminLike(filters.artist), mode: "insensitive" } } })
  if (filters.category) and.push({ category: filters.category })
  if (filters.letter === "#") and.push({ artist: { NOT: adminLetters.filter(letter => letter.length === 1 && letter !== "#").map(letter => ({ name: { startsWith: letter, mode: "insensitive" } })) } })
  else if (filters.letter) and.push({ artist: { name: { startsWith: filters.letter, mode: "insensitive" } } })
  return { AND: and }
}
export function adminSongHref(filters: AdminSongFilters, page: number) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (key !== "page" && value) params.set(key, String(value))
  params.set("page", String(page))
  return "/admin/songs?" + params.toString()
}
export function adminPageNumbers(page: number, total: number) {
  return [...new Set([1, ...Array.from({ length: 5 }, (_, i) => page - 2 + i), total])].filter(value => value >= 1 && value <= total).sort((a, b) => a - b)
}
