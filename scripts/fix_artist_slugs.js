const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

function slugify(name){

return name
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")
.replace(/đ/g,"dj")
.replace(/[^a-z0-9\s-]/g,"")
.replace(/\s+/g,"-")
.replace(/-+/g,"-")
.trim()

}

async function run(){

const artists = await prisma.artist.findMany()

for(const artist of artists){

const slug = slugify(artist.name)

await prisma.artist.update({
where:{id:artist.id},
data:{slug}
})

console.log("Slug fixed:",artist.name,"→",slug)

}

console.log("DONE")

process.exit()

}

run()