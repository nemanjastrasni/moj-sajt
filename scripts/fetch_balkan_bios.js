import fetch from "node-fetch"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function getWikiPage(title) {

const urls = [
`https://sr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
`https://sh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
]

for (const url of urls) {

try {

const res = await fetch(url)
const data = await res.json()

if (data.extract) return data.extract

} catch {}

}

return null
}

async function run() {

const artists = await prisma.artist.findMany()

for (const artist of artists) {

if (artist.bio) continue

const bio = await getWikiPage(artist.name)

if (!bio) {
console.log("No wiki:", artist.name)
continue
}

await prisma.artist.update({
where: { id: artist.id },
data: { bio }
})

console.log("Added bio:", artist.name)

}

process.exit()

}

run()