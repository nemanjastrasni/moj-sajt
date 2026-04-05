const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

function generateBio(artist){

return `${artist.name} je muzički izvođač sa Balkana. 
Ovaj izvođač je poznat po pesmama koje se često sviraju na gitari.

Na sajtu GitaraAkordi možete pronaći akorde i tekstove pesama izvođača ${artist.name}.

U našoj bazi trenutno se nalazi više pesama ovog izvođača koje možete svirati na gitari.`
}

async function run(){

const artists = await prisma.artist.findMany({
where:{
bio: null
}
})

for(const a of artists){

const bio = generateBio(a)

await prisma.artist.update({
where:{ id:a.id },
data:{ bio }
})

console.log("BIO:",a.name)

}

}

run()
