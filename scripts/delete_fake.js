const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function run() {
  const res = await prisma.song.deleteMany({
    where: {
      OR: [
        { title: { startsWith: "Song " } },
        { lyrics: { contains: "Lyrics..." } }
      ]
    }
  })

  console.log("DELETED:", res.count)
}

run()