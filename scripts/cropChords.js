const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const inputDir = path.join(
  __dirname,
  "../public/chord_variants_new_rename"
)

const outputDir = path.join(
  __dirname,
  "../public/chord_variants_final"
)

// napravi output folder ako ne postoji
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function process() {
  const files = fs.readdirSync(inputDir)

  for (const file of files) {
    if (!file.endsWith(".png")) continue

    const inputPath = path.join(inputDir, file)
    const outputPath = path.join(outputDir, file)

    try {
      const image = sharp(inputPath)
      const metadata = await image.metadata()

      const width = metadata.width
      const height = metadata.height

      // sigurnosna provera
      if (!width || !height) {
        console.log(`⚠️ preskačem: ${file}`)
        continue
      }
const cropTop = Math.floor(height * 0.18)

await image
  .extract({
    left: 0,
    top: cropTop,
    width: width,
    height: height - cropTop   // 👈 OVO JE KLJUČ
  })
        .resize(300, 300)
        .png({ quality: 90 })
        .toFile(outputPath)

      console.log(`✔ ${file}`)
    } catch (err) {
      console.error(`❌ ${file}`, err.message)
    }
  }
}

process()