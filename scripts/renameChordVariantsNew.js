const fs = require("fs")
const path = require("path")

const inputDir = path.join(
  __dirname,
  "../public/chord_variants_new"
)

const outputDir = path.join(
  __dirname,
  "../public/chord_variants_new_rename"
)

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

function normalizeChord(name) {
  return name
    .toLowerCase()

    // unicode
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")

    // flats → sharps
    .replace(/^ab/, "G#")
    .replace(/^bb/, "A#")
    .replace(/^eb/, "D#")

    // sharps uppercase
    .replace(/^c#/, "C#")
    .replace(/^f#/, "F#")

    // suspended
    .replace(/suspended-2nd-4th/g, "sus2sus4")
    .replace(/suspended-2nd/g, "sus2")
    .replace(/suspended-4th/g, "sus4")
    .replace(/suspended/g, "sus")

    // chord types
    .replace(/major7/g, "maj7")
    .replace(/major9/g, "maj9")
    .replace(/major/g, "maj")

    .replace(/minor7/g, "m7")
    .replace(/minor9/g, "m9")
    .replace(/minor/g, "m")

    .replace(/diminished/g, "dim")
    .replace(/augmented/g, "aug")

    // power chords
    .replace(/power-chord/g, "5")
    .replace(/5th/g, "5")

    // numbers
    .replace(/13th/g, "13")
    .replace(/11th/g, "11")
    .replace(/9th/g, "9")
    .replace(/7th/g, "7")
    .replace(/6th/g, "6")

    // slash chords
    .replace(/over-/g, "_")

    // variant
    .replace(/-v(\d+)/g, "_v$1")

    // cleanup
    .replace(/-/g, "")

    // uppercase first letter
    .replace(/^([a-g])/, (m) =>
      m.toUpperCase()
    )
}

function processFiles() {
  const files = fs.readdirSync(inputDir)

  for (const file of files) {
    if (!file.endsWith(".png")) continue

    const inputPath = path.join(
      inputDir,
      file
    )

    const baseName = file.replace(
      ".png",
      ""
    )

    const finalName =
      normalizeChord(baseName) + ".png"

    const outputPath = path.join(
      outputDir,
      finalName
    )

    fs.copyFileSync(inputPath, outputPath)

    console.log(
      `✔ ${file} → ${finalName}`
    )
  }
}

processFiles()