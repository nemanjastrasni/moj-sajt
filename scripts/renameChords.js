const fs = require("fs")
const path = require("path")

const inputDir = path.join(__dirname, "../public/chords")
const outputDir = path.join(__dirname, "../public/chords_named")

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

function formatName(name) {
  return name
    .toLowerCase()

    // root (flat → sharp standard)
    .replace(/^ab/, "G#")
    .replace(/^bb/, "A#")
    .replace(/^db/, "C#")
    .replace(/^eb/, "D#")
    .replace(/^gb/, "F#")

    // suspended (MORA PRE "suspended")
    .replace(/suspended-2nd-4th/g, "sus2sus4")
    .replace(/suspended-2nd/g, "sus2")
    .replace(/suspended-4th/g, "sus4")
    .replace(/suspended/g, "sus")

    // tipovi
    .replace(/major/g, "maj")
    .replace(/minor/g, "m")
    .replace(/diminished/g, "dim")
    .replace(/augmented/g, "aug")
    .replace(/power-chord/g, "5")

    // brojevi
    .replace(/13th/g, "13")
    .replace(/11th/g, "11")
    .replace(/9th/g, "9")
    .replace(/7th/g, "7")
    .replace(/6th/g, "6")

    // modifikatori
    .replace(/sharp/g, "#")
    .replace(/flat/g, "b")

    // slash → underscore
    .replace(/over-/g, "_")

    // bb SAMO u slash delu
    .replace(/_bb/g, "_A#")

    // cleanup
    .replace(/-v\d+/g, "")
    .replace(/-/g, "")

    // uppercase za sharp rootove
    .replace(/^g#/, "G#")
    .replace(/^a#/, "A#")
    .replace(/^c#/, "C#")
    .replace(/^d#/, "D#")
    .replace(/^f#/, "F#")

    // uppercase prvo slovo (A, B, C...)
.replace(/^([a-g])/, (match) => match.toUpperCase())

// ukloni dupli root (A#_A# → A#)
.replace(/^([A-G]#)_\1$/, "$1")
}
function process() {
  const folders = fs.readdirSync(inputDir)

  for (const folder of folders) {
    const folderPath = path.join(inputDir, folder)

    if (!fs.lstatSync(folderPath).isDirectory()) continue

    const files = fs.readdirSync(folderPath)

    for (const file of files) {
      if (!file.endsWith(".png")) continue

      const inputPath = path.join(folderPath, file)

      const base = file.replace(".png", "")
      const newName = formatName(base) + ".png"

const nameWithoutExt = newName.replace(".png", "")

let finalName = `${nameWithoutExt}_v1.png`
let counter = 2

while (fs.existsSync(path.join(outputDir, finalName))) {
  finalName = `${nameWithoutExt}_v${counter}.png`
  counter++
}

const outputPath = path.join(outputDir, finalName)

      fs.copyFileSync(inputPath, outputPath)

      console.log(`✔ ${file} → ${finalName}`)
    }
  }
}

process()