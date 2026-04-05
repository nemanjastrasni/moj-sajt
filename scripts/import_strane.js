const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")
const baseDir = "C:/DEV/moj-sajt/strane_raw"
const artists = require("./artists_seed")

console.log("RUN START")
const files = fs.readdirSync(baseDir)
console.log("FILES:", files)

const prisma = new PrismaClient()


function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function cleanContent(text) {
  return text
    .replace(/\[.*?\]/g, "") // [Verse], [Chorus]
    .replace(/capo.*\n/gi, "")
    .replace(/tuning.*\n/gi, "")
    .replace(/tempo.*\n/gi, "")
    .replace(/^\s*$/gm, "")
    .trim()
}

async function run() {
  const files = fs.readdirSync(baseDir)
  const validFiles = files.filter(f => f.includes("dataset_full"))

  for (const file of validFiles){
    const filePath = path.join(baseDir, file)

    if (!file.endsWith(".json")) continue

    let data

try {
  data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
} catch (e) {
  console.log("BAD FILE:", file)
  continue
}

for (const raw of data) {
  const title = raw.title || "Unknown"
const artistName = raw.artist || "Unknown"
const content = cleanContent(raw.text || `${raw.title}`)
if (!artists.some(a => artistName.toLowerCase().includes(a.toLowerCase()))) continue

const artistSlug = slugify(artistName)
const songSlug = slugify(title)


   
    try {
      // ARTIST
      let artist = await prisma.artist.findUnique({
        where: { slug: artistSlug },
      })

      if (!artist) {
        artist = await prisma.artist.create({
          data: {
            name: artistName,
            slug: artistSlug,
          },
        })
      }

      // SONG
      const exists = await prisma.song.findFirst({
        where: {
          slug: songSlug,
          artistId: artist.id,
        },
      })

      if (exists) {
        console.log("SKIP:", title)
        continue
      }

      await prisma.song.create({
  data: {
    title,
    slug: songSlug,
    artistId: artist.id,
    lyrics: content,
chords: content,
    category: "strane",
  },
})

      console.log("SAVED:", artistName, "-", title)
    } catch (err) {
      console.log("ERROR:", file, err.message)
    }
  }

  await prisma.$disconnect()
}
}
run()