/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible, local-only image derivatives. */
const fs = require('node:fs/promises'), path = require('node:path'), { createHash } = require('node:crypto'), sharp = require('sharp')
const root = path.resolve(__dirname, '..')
const sources = {
  heroStrane: 'images/hero/strane.jpg', heroDomace: 'images/hero/domace.jpg', heroNarodne: 'images/hero/narodne.jpg',
  categoryNarodne: 'images/narodne.jpg', categoryDomace: 'images/domace.jpg', categoryStrane: 'images/strane.jpg',
  popularBackground: 'images/hero/hero-festival-purple.jpg', latestBackground: 'images/hero/hero-openair-stage.jpg',
}
async function main() {
  const directory = path.join(root, 'public/images/optimized'), manifest = {}
  await fs.mkdir(directory, { recursive: true })
  for (const [name, source] of Object.entries(sources)) {
    const bytes = await fs.readFile(path.join(root, 'public', source)), metadata = await sharp(bytes).metadata()
    const widths = name.startsWith('category') ? [480, 960] : [640, 1280, 1920]
    const variants = []
    for (const width of widths.filter(width => width <= metadata.width)) {
      const hash = createHash('sha256').update(bytes).update(JSON.stringify({ width, quality: 78, format: 'webp', version: 1 })).digest('hex').slice(0, 12)
      const filename = `${name}-${width}-${hash}.webp`, target = path.join(directory, filename)
      const { data, info } = await sharp(bytes).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toBuffer({ resolveWithObject: true })
      await fs.writeFile(target, data)
      variants.push({ src: '/images/optimized/' + filename, width: info.width, height: info.height, bytes: data.length })
    }
    const largest = variants.at(-1)
    if (!largest) throw Error('Source image is too small: ' + source)
    manifest[name] = { source: '/' + source, sourceBytes: bytes.length, ...largest, srcSet: variants.map(image => `${image.src} ${image.width}w`).join(', '), variants }
    console.log(JSON.stringify({ image: name, sourceBytes: bytes.length, variants: variants.map(image => ({ width: image.width, bytes: image.bytes })) }))
  }
  await fs.writeFile(path.join(root, 'lib/site-image-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
