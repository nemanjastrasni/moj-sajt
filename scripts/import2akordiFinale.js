const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

const ROOT = "../scraper/songs_2akordi_stageFinale"

// slugify
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

// parse filename: "Artist - Song.txt"
function parseFileName(fileName) {
  const name = fileName.replace(".txt", "")
  const [artist, ...rest] = name.split(" - ")
  const title = rest.join(" - ")

  return {
    artist: artist.trim(),
    title: title.trim()
  }
}

async function run() {
  const artistFolders = fs.readdirSync(ROOT)

  for (const folder of artistFolders) {
    const folderPath = path.join(ROOT, folder)

    if (!fs.statSync(folderPath).isDirectory()) continue

    const files = fs.readdirSync(folderPath)

    for (const file of files) {
      if (!file.endsWith(".txt")) continue

      const filePath = path.join(folderPath, file)
      const content = fs.readFileSync(filePath, "utf-8")

      const { artist, title } = parseFileName(file)

      const artistSlug = slugify(artist)
      const slug = slugify(`${artist}-${title}`)

      try {
        let artistRecord = await prisma.artist.findUnique({
          where: { slug: artistSlug }
        })

        if (!artistRecord) {
          artistRecord = await prisma.artist.create({
            data: {
              name: artist,
              slug: artistSlug,
              category: "domace"
            }
          })
        }

        const artistId = artistRecord.id

        await prisma.song.upsert({
          where: {
            artistId_slug: {
              artistId,
              slug
            }
          },
          update: {},
          create: {
            title,
            slug,
            lyrics: content,
            chords: null,
            artistId,
            category: "domace"
          }
        })

        console.log(`✔ ${artist} - ${title}`)
      } catch (err) {
        console.log(`❌ ERROR: ${file}`, err.message)
      }
    }
  }

  await prisma.$disconnect()
}

run()