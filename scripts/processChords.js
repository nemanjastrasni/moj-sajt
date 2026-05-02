const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const folders = fs.readdirSync(inputDir)

for (const folder of folders) {
  const folderPath = path.join(inputDir, folder)
  const files = fs.readdirSync(folderPath)

  for (const file of files) {
    if (!file.endsWith(".png")) continue

    const inputPath = path.join(folderPath, file)

    const baseName = file.replace(".png", "")
    const newName = formatName(baseName) + ".png"

    const outputPath = path.join(outputDir, newName)

    await sharp(inputPath)
      .extract({ left: 0, top: 140, width: 800, height: 800 })
      .resize(300, 300)
      .toFile(outputPath)

    console.log(`✔ ${file} → ${newName}`)
  }
}
const inputDir = path.join(__dirname, "../public/chords_raw")
const outputDir = path.join(__dirname, "../public/chords")

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir)
}

function formatName(name) {
  return name
    .replace(/ 7th Sharp 9/i, "7#9")
    .replace(/ 7th Suspended 4th/i, "7sus4")
    .replace(/ 7th Flat 5/i, "7b5")
    .replace(/ 7th Flat 9/i, "7b9")
    .replace(/ 9th Sharp 11/i, "9#11")
    .replace(/ 9th Flat 5/i, "9b5")
    .replace(/ 7th/i, "7")
    .replace(/ 6th/i, "6")
    .replace(/ /g, "")
}

async function process() {
  const files = fs.readdirSync(inputDir)

  for (const file of files) {
    if (!file.endsWith(".png")) continue

    const inputPath = path.join(inputDir, file)

    const baseName = file.replace(".png", "")
    const newName = formatName(baseName) + ".png"

    const outputPath = path.join(outputDir, newName)

    await sharp(inputPath)
      .extract({ left: 0, top: 140, width: 800, height: 800 }) // crop TOP
      .resize(300, 300)
      .toFile(outputPath)

    console.log(`✔ ${file} → ${newName}`)
  }
}

process()