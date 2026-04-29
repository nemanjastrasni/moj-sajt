import { prisma } from "@/lib/prisma"

const beginnerChords = ["G", "C", "D", "Em", "Am", "A", "E"]
const intermediateChords = ["F", "Bm", "Dm", "B"]

function detectDifficulty(chords: string | null) {
  if (!chords) return "beginner"

  const text = chords.toUpperCase()

  if (
    text.includes("MAJ7") ||
    text.includes("DIM") ||
    text.includes("SUS") ||
    text.includes("ADD9") ||
    text.includes("9") ||
    text.includes("11") ||
    text.includes("13")
  ) {
    return "advanced"
  }

  for (const chord of intermediateChords) {
    if (text.includes(chord)) {
      return "intermediate"
    }
  }

  return "beginner"
}

async function main() {
  const songs = await prisma.song.findMany()

  for (const song of songs) {
    const difficulty = detectDifficulty(song.chords)

    await prisma.song.update({
      where: {
        id: song.id,
      },
      data: {
        difficulty,
      },
    })
  }

  console.log("Difficulty update završen.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())