const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

function reset(name){

return name
.replace(/đ/g,"dj")
.replace(/Đ/g,"Dj")
.replace(/ć/g,"c")
.replace(/Ć/g,"C")
.replace(/č/g,"c")
.replace(/Č/g,"C")
.replace(/ž/g,"z")
.replace(/Ž/g,"Z")
.replace(/š/g,"s")
.replace(/Š/g,"S")

}

async function run(){

const artists = await prisma.artist.findMany()

for(const artist of artists){

const name = reset(artist.name)

await prisma.artist.update({
where:{ id: artist.id },
data:{ name }
})

console.log("Reset:", name)

}

process.exit()

}

run()