const axios = require("axios")
const cheerio = require("cheerio")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function getWikiPage(name) {

const wikis = ["sr","sh","en"]

for (const lang of wikis) {

try {

const searchUrl =
`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json`

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

const bio = $("p").first().text()

let members = []

$(".infobox tr").each((i,el)=>{

const th = $(el).find("th").text().toLowerCase()
const td = $(el).find("td")

if (th.includes("članovi") || th.includes("members")) {
members = td.text().split("\n").map(x=>x.trim()).filter(Boolean)
}

})

const albums = []

$("li").each((i,li)=>{

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
title: text.replace(/\(\d{4}\)/,"").trim(),
year
})

}

})

return { bio, members, albums }
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

await prisma.artist.update({
where: { id: artist.id },
data: {
bio: data.bio,
members: data.members,
discography: data.albums
}
})

console.log("Saved:", artist.name)

}

console.log("DONE")

process.exit()
}

run()