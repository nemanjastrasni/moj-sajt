/* eslint-disable @typescript-eslint/no-require-imports -- Local image derivatives; originals and WebP fallbacks are preserved. */
const fs = require('node:fs/promises'), path = require('node:path'), { createHash } = require('node:crypto'), sharp = require('sharp')
const names = ['categoryNarodne', 'categoryDomace', 'categoryStrane', 'popularBackground', 'latestBackground']
async function main() {
  const root = path.resolve(__dirname, '..'), file = path.join(root, 'lib/site-image-manifest.json')
  const manifest = JSON.parse(await fs.readFile(file, 'utf8'))
  for (const name of names) {
    const image = manifest[name], source = await fs.readFile(path.join(root, 'public', image.source)), variants = []
    for (const fallback of image.variants) {
      const settings = { width: fallback.width, quality: name.endsWith('Background') ? 45 : 55, effort: 6, format: 'avif', version: 1 }
      const hash = createHash('sha256').update(source).update(JSON.stringify(settings)).digest('hex').slice(0, 12)
      const src = `/images/optimized/${name}-${fallback.width}-${hash}.avif`
      const { data, info } = await sharp(source).rotate().resize({ width: fallback.width, withoutEnlargement: true }).avif({ quality: settings.quality, effort: settings.effort }).toBuffer({ resolveWithObject: true })
      if (info.width !== fallback.width || info.height !== fallback.height) throw Error('Derivative dimensions differ: ' + name)
      await fs.writeFile(path.join(root, 'public', src), data)
      variants.push({ src, width: info.width, height: info.height, bytes: data.length })
    }
    // Enable only a set that is smaller at every responsive width.
    if (variants.some((variant, i) => variant.bytes >= image.variants[i].bytes)) throw Error('AVIF does not improve every width: ' + name)
    image.avifSrcSet = variants.map(variant => `${variant.src} ${variant.width}w`).join(', ')
    image.avifVariants = variants
    console.log(JSON.stringify({ name, variants: variants.map((variant, i) => ({ width: variant.width, webp: image.variants[i].bytes, avif: variant.bytes })) }))
  }
  await fs.writeFile(file, JSON.stringify(manifest, null, 2) + '\n')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
