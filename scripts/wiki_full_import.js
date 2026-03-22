const axios = require("axios")
const cheerio = require("cheerio")
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
async function getWikiPage(name) {
const wikis = ["sr","sh","en"]
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")
const DISCOGS_TOKEN = "YOUR_DISCOGS_TOKEN"

function toLatin(text = "") {
  const map = {
    "А":"A","Б":"B","В":"V","Г":"G","Д":"D","Ђ":"Đ","Е":"E","Ж":"Ž","З":"Z","И":"I","Ј":"J","К":"K","Л":"L","Љ":"Lj","М":"M","Н":"N","Њ":"Nj","О":"O","П":"P","Р":"R","С":"S","Т":"T","Ћ":"Ć","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Č","Џ":"Dž","Ш":"Š",
    "а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","џ":"dž","ш":"š"
  }

  return text.split("").map(c => map[c] || c).join("")
}

async function getArtistGenre(name) {
  try {
    const search = await axios.get(
      `https://api.discogs.com/database/search?q=${encodeURIComponent(name)}&type=artist&token=${DISCOGS_TOKEN}`
    )

    if (!search.data.results.length) return null

    const result = search.data.results[0]

    if (!result.genre) return null

    return result.genre[0]

  } catch {
    return null
  }
}

async function getDiscogsAlbums(name) {
  try {
    const search = await axios.get(
      `https://api.discogs.com/database/search?q=${encodeURIComponent(name)}&type=artist&token=${DISCOGS_TOKEN}`
    )

    if (!search.data.results.length) return []

    const result = search.data.results.find(r =>
      r.type === "artist" &&
      (
        (r.country && ["Yugoslavia","Serbia","Croatia","Bosnia","Slovenia","Macedonia"].includes(r.country)) ||
        (r.title && r.title.toLowerCase().includes(name.toLowerCase()))
      )
    )

    if (!result) return []

    const artistId = result.id

    const releases = await axios.get(
      `https://api.discogs.com/artists/${artistId}/releases?token=${DISCOGS_TOKEN}`
    )

    return releases.data.releases
      .filter(r => r.type === "master")
      .slice(0, 10)
      .map(r => ({
        title: r.title,
        year: r.year
      }))

  } catch (e) {
    console.log("Discogs error:", name)
    return []
  }
}

async function saveArtistImage(url, slug) {

const file = path.join(__dirname, "../public/artists", `${slug}.jpg`)

const res = await axios({
url,
responseType: "arraybuffer"
})

await sharp(res.data)
.resize(1200, 675, { fit: "cover" })
.webp({ quality: 85 })
.toFile(file.replace(".jpg",".webp"))

return `/artists/${slug}.webp`
}

for (const lang of wikis) {

try {

const searchUrl =
`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + " muzika")}&format=json`


const search = await axios.get(searchUrl,{
headers:{
"User-Agent":"GitaraAkordiBot/1.0 (https://gitaraakordi.com)"
}
})

if (!search.data.query.search.length) continue

const title = search.data.query.search[0].title

const pageUrl =
`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`

const res = await axios.get(pageUrl,{
headers:{
"User-Agent":"GitaraAkordiBot/1.0 (https://gitaraakordi.com)"
}
})

return res.data

} catch {}

}

return null
}

function extractData(html) {

const $ = cheerio.load(html)

let imageUrl = null

const img = $(".infobox img").filter((i,el)=>{
const alt = $(el).attr("alt") || ""
return !alt.toLowerCase().includes("logo")
}).first()

if (img.length) {

const src = img.attr("src")
const width = parseInt(img.attr("width") || "0")

if (width >= 900) {
imageUrl = src.startsWith("http") ? src : `https:${src}`
imageUrl = imageUrl.replace(/\/\d+px/, "/1200px")
}

}

const bio = toLatin(
  $(".mw-parser-output > p")
    .map((i,el)=>$(el).text())
    .get()
    .slice(0,6)
    .join("\n\n")
)

let members = []

$(".infobox tr").each((i,el)=>{

const th = $(el).find("th").text().toLowerCase()
const td = $(el).find("td")

if (th.includes("članovi") || th.includes("members")) {
members = td.text()
  .split("\n")
  .map(x => toLatin(x.trim()))
  .filter(Boolean)
}

})

const albums = []

$("#Discography, #Diskografija")
.nextUntil("h2")
.find("li")
.each((i,li)=>{

const text = $(li).text()
if (
text.match(/\d{4}/) &&
!text.includes("Telegraf") &&
!text.includes("Tekstomanija") &&
!text.includes("Приступљено") &&
!text.includes("последње измене") &&
!text.includes("Рођени")
) {

const year = text.match(/\d{4}/)[0]

albums.push({
  title: toLatin(text.replace(/\(\d{4}\)/,"").trim()),
  year
})

}

})

return { bio, members, albums, imageUrl }
}

async function run() {

const artists = await prisma.artist.findMany()

for (const artist of artists) {

console.log("Processing:", artist.name)

const html = await getWikiPage(artist.name)

if (!html) {
console.log("No page:", artist.name)
continue
}

const data = extractData(html)
const discogsAlbums = await getDiscogsAlbums(artist.name)

await prisma.artist.update({
where: { id: artist.id },
data: {
bio: data.bio,
members: data.members,
discography: discogsAlbums.length ? discogsAlbums : data.albums,
image: data.imageUrl ? await saveArtistImage(data.imageUrl, artist.slug) : null
}
})

console.log("Saved:", artist.name)

}

console.log("DONE")

process.exit()
}

run()