const { PrismaClient } = require("@prisma/client")
const fs = require("fs")

const prisma = new PrismaClient()

async function run(){

const artists = await prisma.artist.findMany({
select:{ name:true }
})

fs.writeFileSync("artists.json",JSON.stringify(artists,null,2))

}

run()