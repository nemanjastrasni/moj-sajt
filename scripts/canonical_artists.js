const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

function fixDiacritics(name){

return name
.replace(/Dj/g,"Đ")
.replace(/dj/g,"đ")
.replace(/c/g,"ć")
.replace(/C/g,"Ć")

}

function reorder(name){

if(name.includes(",")){
const parts = name.split(",")
return `${parts[1].trim()} ${parts[0].trim()}`
}

const words = name.split(" ")

if(words.length === 2){
return `${words[0]} ${words[1]}`
}

return name
}

async function run(){

const artists = await prisma.artist.findMany()

for(const artist of artists){

let name = artist.name

name = reorder(name)
name = fixDiacritics(name)

await prisma.artist.update({
where:{id:artist.id},
data:{name}
})

console.log("Cleaned:",artist.name,"→",name)

}

console.log("DONE")
process.exit()

}

run()