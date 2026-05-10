const fs = require("fs")
const path = require("path")

const chordsDir = path.join(__dirname, "../public/chords_final")

const files = fs.readdirSync(chordsDir)

const map = {}

files.forEach((file) => {
  if (!file.endsWith(".png")) return

  const clean = file.replace(/_v\d+\.png$/, "")
  map[clean] = `/chords_final/${file}`
})

const output = `
export const chordImages = ${JSON.stringify(map, null, 2)}
`

fs.writeFileSync(
  path.join(__dirname, "../lib/chords/chordImages.ts"),
  output
)

console.log("✅ chordImages.ts generated")