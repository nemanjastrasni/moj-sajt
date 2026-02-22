const { PrismaClient } = require("@prisma/client")

const galija = require("../lib/data/domace/galija").default
const ekv = require("../lib/data/domace/ekv").default

const prisma = new PrismaClient()

const artists = [
  { slug: "galija", data: galija },
  { slug: "ekv", data: ekv },
]

async function main() {
  for (const { slug, data } of artists) {
    const artist = await prisma.artist.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: data.artistFull,
        image: data.image ?? null,
        bio: data.bio ?? null,
        discography: data.discography?.join("\n") ?? null,
      },
    })

    for (const song of data.songs) {
      await prisma.song.upsert({
        where: { id: song.id },
        update: {
          title: song.title,
          lyrics: song.content,
          slug: song.id,
        },
        create: {
          id: song.id,
          slug: song.id,
          title: song.title,
          lyrics: song.content,
          category: "domace",
          artist: {
            connect: { id: artist.id },
          },
        },
      })
    }
  }
}

main()
  .then(() => {
    console.log("✅ Seed finished")
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })