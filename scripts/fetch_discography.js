import fetch from "node-fetch"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function getWikiText(title) {

const urls = [
`https://sr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json`,
`https://sh.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json`,
`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json`
]

for (const url of urls) {

try {

const res = await fetch(url)
const data = await res.json()

const pages = data.query.pages
const page = Object.values(pages)[0]

if (page.extract) return page.extract

} catch {}

}

return null
}

function extractAlbums(text) {

const albums = []

const lines = text.split("\n")

for (const line of lines) {

if (/\(\d{4}\)/.test(line)) {

const yearMatch = line.match(/\d{4}/)
const year = yearMatch ? yearMatch[0] : null

const title = line.replace(/\(\d{4}\)/,"").trim()

if (title.length > 2) {
albums.push({ title, year })
}

}

}

return albums
}

async function run() {

const artists = await prisma.artist.findMany()

for (const artist of artists) {

const text = await getWikiText(artist.name)

if (!text) {
console.log("No wiki:", artist.name)
continue
}

const albums = extractAlbums(text)

if (albums.length === 0) {
console.log("No albums:", artist.name)
continue
}

await prisma.artist.update({
where: { id: artist.id },
data: { discography: albums }
})

console.log("Discography added:", artist.name)

}

process.exit()

}

run()