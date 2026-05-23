const fs = require("fs")
const path = require("path")

const inputDir = path.join(
  __dirname,
  "../public/chord_variants_crop"
)

const outputDir = path.join(
  __dirname,
  "../public/chord_variants_final"
)

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

function formatName(name) {
  return name
    .toLowerCase()

    // unicode symbols
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")

    // flats → sharps
    .replace(/^ab/i, "G#")
    .replace(/^bb/i, "A#")
    .replace(/^db/i, "C#")
    .replace(/^eb/i, "D#")
    .replace(/^gb/i, "F#")

    // suspended
    .replace(/suspended-2nd-4th/g, "sus2sus4")
    .replace(/suspended-2nd/g, "sus2")
    .replace(/suspended-4th/g, "sus4")
    .replace(/suspended/g, "sus")

    // chord types
    .replace(/major/g, "maj")
    .replace(/minor/g, "m")
    .replace(/diminished/g, "dim")
    .replace(/augmented/g, "aug")
    .replace(/power-chord/g, "5")

    // numbers
    .replace(/13th/g, "13")
    .replace(/11th/g, "11")
    .replace(/9th/g, "9")
    .replace(/7th/g, "7")
    .replace(/6th/g, "6")

    // modifiers
    .replace(/sharp/g, "#")
    .replace(/flat/g, "b")

    // slash chords
    .replace(/over-/g, "_")

    // SAČUVAJ variant broj
    .replace(/-v(\d+)/i, "_v$1")

    // cleanup
    .replace(/-/g, "")

    // uppercase sharp roots
    .replace(/^g#/, "G#")
    .replace(/^a#/, "A#")
    .replace(/^c#/, "C#")
    .replace(/^d#/, "D#")
    .replace(/^f#/, "F#")

    // uppercase first letter
    .replace(/^([a-g])/, (match) =>
      match.toUpperCase()
    )

    // duplicate cleanup
    .replace(/^([A-G]#)_\1$/, "$1")
}

function process() {
  const files = fs.readdirSync(inputDir)

  for (const file of files) {
    if (!file.endsWith(".png")) continue

    const inputPath = path.join(inputDir, file)

    const base = file.replace(".png", "")
    const newName = formatName(base) + ".png"

    const outputPath = path.join(
      outputDir,
      newName
    )

    fs.copyFileSync(inputPath, outputPath)

    console.log(`✔ ${file} → ${newName}`)
  }
}

process()