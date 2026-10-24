type AdminResult = { success: boolean; error?: string; songs?: { id: string; title: string; slug: string }[]; artist?: { name: string; slug: string }; category?: string }

export async function adminSongRequest(url: string, method: "POST" | "PATCH" | "DELETE", data: unknown): Promise<AdminResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, { method, signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    let result: AdminResult
    try { result = await response.json() } catch { throw new Error("Server nije vratio ispravan odgovor. Proveri spisak pre ponovnog pokusaja.") }
    if (!response.ok || result?.success !== true) throw new Error(result?.error || "Izmena nije uspela. Proveri spisak pre ponovnog pokusaja.")
    return result
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Zahtev traje predugo. Proveri spisak pre ponovnog slanja.")
    if (error instanceof TypeError) throw new Error("Veza je prekinuta. Proveri spisak pre ponovnog slanja.")
    throw error
  } finally { clearTimeout(timer) }
}
