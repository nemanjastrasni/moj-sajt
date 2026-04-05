const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const baseDir = "C:/DEV/scraper/songs_stage6"

console.log("Reading from:", baseDir)

function slugify(text){
  return text
    .toLowerCase()
    .replace(/[čćžšđ]/g,c=>({č:"c",ć:"c",ž:"z",š:"s",đ:"dj"}[c]))
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-|-$/g,"")
}

async function run(){

  const categories = fs.readdirSync(baseDir)

  for(const category of categories){

    const categoryPath = path.join(baseDir, category)
    if(!fs.statSync(categoryPath).isDirectory()) continue

    const artists = fs.readdirSync(categoryPath)

    for(const artistFolder of artists){

      const artistPath = path.join(categoryPath, artistFolder)
      if(!fs.statSync(artistPath).isDirectory()) continue

      const artistName = artistFolder
        .replace(/-/g," ")
        .replace(/\b\w/g,l=>l.toUpperCase())

      const artistSlug = slugify(artistName)

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

      const files = fs.readdirSync(artistPath)

      for(const file of files){

        if(!file.endsWith(".txt")) continue

        const name = file.replace(".txt","")

        const songTitle = name
          .replace(artistFolder + "-", "")
          .replace(/-/g," ")
          .trim()

        const songSlug = slugify(songTitle)

        const content = fs.readFileSync(
          path.join(artistPath,file),
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
            console.log("Duplicate:",artistName,"-",songTitle)
          }else{
            console.log("Error:",e)
          }
        }

      }

    }

  }

  console.log("DONE")

}

run()