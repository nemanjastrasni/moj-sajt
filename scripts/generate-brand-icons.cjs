/* eslint-disable @typescript-eslint/no-require-imports -- Generate static vector/raster icons from the shared brand geometry. */
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node' } })
const fs = require('node:fs/promises'), path = require('node:path'), sharp = require('sharp')
const { BRAND_A_PATH, BRAND_PICK_PATH, BRAND_ACCENT, BRAND_LABEL } = require('../lib/brand.ts')
const root = path.resolve(__dirname, '..'), background = '#0b0e0a'
const mark = `<path d="${BRAND_PICK_PATH}" stroke="${BRAND_ACCENT}" stroke-width="6" stroke-linecap="round"/><path transform="translate(24 29) scale(.56)" d="${BRAND_A_PATH}" fill="${BRAND_ACCENT}" fill-rule="evenodd"/>`
function iconSvg(size, maskable = false) {
  // The maskable icon uses the same 70% centered artwork and opaque background.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96" fill="none" role="img" aria-label="${BRAND_LABEL}: GA"><rect width="96" height="96" rx="${maskable ? 0 : 22}" fill="${background}"/><g${maskable ? ' transform="translate(14.4 14.4) scale(.7)"' : ''}><g transform="translate(16 8) scale(.76)">${mark}</g></g></svg>\n`
}
async function main() {
  await fs.writeFile(path.join(root, 'app/icon.svg'), iconSvg(96))
  await fs.writeFile(path.join(root, 'public/brand/gitarakordi-symbol.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 104" fill="none" role="img" aria-label="${BRAND_LABEL}: trzalica sa slovima GA">${mark}</svg>\n`)
  for (const [file, size, maskable] of [['app/apple-icon.png', 180, false], ['public/pwa/icon-192.png', 192, false], ['public/pwa/icon-512.png', 512, false], ['public/pwa/icon-maskable-512.png', 512, true]]) {
    await sharp(Buffer.from(iconSvg(size, maskable))).png().toFile(path.join(root, file))
  }
  // PNG-compressed images in a standard multi-size ICO container.
  const sizes = [16, 32, 48, 64], frames = await Promise.all(sizes.map(size => sharp(Buffer.from(iconSvg(size))).png().toBuffer()))
  const header = Buffer.alloc(6 + sizes.length * 16)
  header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4)
  let offset = header.length
  sizes.forEach((size, index) => {
    const entry = 6 + index * 16
    header[entry] = size; header[entry + 1] = size
    header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(frames[index].length, entry + 8); header.writeUInt32LE(offset, entry + 12)
    offset += frames[index].length
  })
  await fs.writeFile(path.join(root, 'app/favicon.ico'), Buffer.concat([header, ...frames]))
  console.log('Generated GA SVG, favicon (16/32/48/64), Apple (180) and PWA (192/512/maskable) icons.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
