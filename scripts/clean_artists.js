const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

function cleanName(name){

return name
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")
.replace(/dj/g,"đ")
.replace(/\s+/g," ")
.trim()

}

async function run(){

const artists = await prisma.artist.findMany()

for(const artist of artists){

let name = cleanName(artist.name)

await prisma.artist.update({
where:{id:artist.id},
data:{name}
})

console.log("Fixed:",name)

}

process.exit()

}

run()