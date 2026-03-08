const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const baseDir = "C:/DEV/scraper/songs_stage6"
const categories = ["domace","narodne","strane"]

console.log("Reading from:", baseDir)

function slugify(text){
return text
.toLowerCase()
.replace(/[čćžšđ]/g,c=>({č:"c",ć:"c",ž:"z",š:"s",đ:"dj"}[c]))
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-|-$/g,"")
}

async function run(){

for(const category of categories){

const songsDir = path.join(baseDir,category)

if(!fs.existsSync(songsDir)) continue

const files = fs.readdirSync(songsDir)

for(const file of files){

const name = file.replace(".txt","")
const parts = name.split(" - ")

if(parts.length !== 2) continue

const artistName = parts[0].trim()
const songTitle = parts[1].trim()

const artistSlug = slugify(artistName)
const songSlug = slugify(songTitle)

let artist = await prisma.artist.findUnique({
where:{ slug: artistSlug }
})

if(!artist){
artist = await prisma.artist.create({
data:{
name: artistName,
slug: artistSlug,
category: category
}
})
}

const content = fs.readFileSync(
path.join(songsDir,file),
"utf8"
)

try{

await prisma.song.create({
data:{
title: songTitle,
slug: songSlug,
lyrics: content,
artistId: artist.id,
category: category
}
})

console.log("Imported:",artistName,"-",songTitle)

}catch(e){

if(e.code === "P2002"){
console.log("Duplicate skipped:",artistName,"-",songTitle)
}else{
console.log("Error:",e)
}

}

}

}

console.log("DONE")

}

run()