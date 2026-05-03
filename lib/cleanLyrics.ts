export function cleanLyrics(text: string) {
  if (!text) return text

  return text
    // normalize
    .replace(/\bGis\b/g, "G#")
    .replace(/\bFis\b/g, "F#")
    .replace(/\bDis\b/g, "D#")
    .replace(/\bCis\b/g, "C#")
    .replace(/\bAis\b/g, "A#")
    .replace(/\bH\b/g, "B")
    .replace(/\(([^)]+)\)/g, "[$1]")
    .replace(/\.+/g, " ")
    .replace(/[.\-]{2,}/g, " ")
.replace(/([A-G][#b]?)([A-G][#b]?)/g, "$1 $2")
   

    // (F#m) → F#m
    .replace(/\(([^)]+)\)/g, "$1")

    // 🔥 pametno razmaci umesto crtica
    .split("\n")
    .map(line => {
      if (line.includes("-")) {
        return line
          .replace(/-+/g, (m) => " ".repeat(Math.min(m.length, 10)))
          .trimEnd()
      }
      return line
    })
    .join("\n")
}