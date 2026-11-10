/* eslint-disable @typescript-eslint/no-require-imports -- Generate static thumbnails from reviewed local photos; no network or database. */
const fs = require("node:fs/promises")
const path = require("node:path")
const crypto = require("node:crypto")
const sharp = require("sharp")

const ROOT = path.resolve(__dirname, "..")
const WIDTHS = [80, 160, 320, 640]
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex")

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "public/artist-photos/manifest.json"), "utf8"))
  const directory = path.join(ROOT, "public/artist-photos/responsive")
  await fs.mkdir(directory, { recursive: true })
  const images = {}
  let originalBytes = 0, avatarBytes = 0, generatedBytes = 0, files = 0
  for (const photo of manifest.photos) {
    if (images[photo.image]) continue
    if (!/^\/artist-photos\/Q\d+-[a-f0-9]{16}\.webp$/.test(photo.image)) throw Error("Unsupported reviewed photo path")
    const source = await fs.readFile(path.join(ROOT, "public", photo.image))
    if (digest(source) !== photo.sha256) throw Error("Reviewed photo checksum changed: " + photo.image)
    const meta = await sharp(source).metadata()
    const candidates = []
    for (const width of WIDTHS.filter(width => width < meta.width)) {
      const { data, info } = await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 76, effort: 4 }).toBuffer({ resolveWithObject: true })
      const filename = `${path.basename(photo.image, ".webp")}-${info.width}-${digest(data).slice(0, 12)}.webp`
      await fs.writeFile(path.join(directory, filename), data)
      candidates.push({ src: "/artist-photos/responsive/" + filename, width: info.width, height: info.height, bytes: data.length })
      generatedBytes += data.length; files++
    }
    candidates.push({ src: photo.image, width: meta.width, height: meta.height, bytes: source.length })
    images[photo.image] = candidates
    originalBytes += source.length; avatarBytes += (candidates.find(row => row.width >= 80) ?? candidates.at(-1)).bytes
  }
  await fs.writeFile(path.join(ROOT, "lib/artist-image-variants.json"), JSON.stringify(images) + "\n")
  console.log(JSON.stringify({ artists: manifest.photos.length, uniquePhotos: Object.keys(images).length, files, originalBytes, avatar80Bytes: avatarBytes, generatedBytes, avatarReductionPercent: +(100 * (1 - avatarBytes / originalBytes)).toFixed(1) }))
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
