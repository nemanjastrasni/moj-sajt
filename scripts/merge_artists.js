const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

function normalize(name) {
return name
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")
.replace(/[đ]/g,"dj")
.replace(" i instruktori","")
.replace(" bend","")
.replace(" band","")
.replace(/[^\w\s]/g,"")
.trim()
}

async function run() {

const artists = await prisma.artist.findMany({
include:{ songs:true }
})

const map = {}

for (const artist of artists) {

const key = normalize(artist.name)

if (!map[key]) {
map[key] = artist
continue
}

const main = map[key]
const credited = await prisma.songPerformer.count({ where: { OR: [
  { artistId: { in: [artist.id, main.id] } },
  { song: { artistId: { in: [artist.id, main.id] } } },
] } })
if (credited) {
  console.log("Skipped credited artist; manual merge required:", artist.name)
  continue
}

await prisma.song.updateMany({
where:{ artistId: artist.id },
data:{ artistId: main.id }
})

await prisma.artist.delete({
where:{ id: artist.id }
})

console.log("Merged:", artist.name, "→", main.name)

}

console.log("DONE")

process.exit()

}

run()
