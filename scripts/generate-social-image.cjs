/* eslint-disable @typescript-eslint/no-require-imports -- Reproducible social card from the existing approved vector logo. */
const path = require('node:path'), sharp = require('sharp')
async function main() {
  const root = path.resolve(__dirname, '..'), output = path.join(root, 'public/brand/gitarakordi-share.png')
  const logo = await sharp(path.join(root, 'public/brand/gitarakordi-guitar.svg')).resize({ width: 1000 }).png().toBuffer()
  const caption = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><path d="M100 455H1100" stroke="#30382d"/><text x="600" y="515" text-anchor="middle" fill="#fafafa" font-family="Arial, sans-serif" font-size="35" font-weight="bold">Akordi za gitaru · Tekstovi pesama</text><text x="600" y="567" text-anchor="middle" fill="#bdbdbd" font-family="Arial, sans-serif" font-size="25">Biografije · Diskografije · Plejliste</text></svg>')
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#080a07' } }).composite([{ input: logo, left: 100, top: 65 }, { input: caption }]).png({ compressionLevel: 9 }).toFile(output)
  console.log('Created public/brand/gitarakordi-share.png (1200 × 630)')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
