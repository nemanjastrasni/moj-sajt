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