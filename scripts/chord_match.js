const axios = require("axios")
const cheerio = require("cheerio")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function fetchChords(artist, title) {
  const query = encodeURIComponent(`${artist} ${title} chords`)

  const url = `https://duckduckgo.com/html/?q=${query}`

  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const $ = cheerio.load(res.data)

    let link = null

    $("a").each((i, el) => {
      const href = $(el).attr("href")

      if (href && href.includes("ultimate-guitar.com")) {
        link = href
        return false
      }
    })

    if (!link) return null

    const page = await axios.get(link, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const html = page.data

    const match = html.match(/\[ch\](.*?)\[\/ch\]/g)

    if (!match) return null

    const chords = match.map(c => c.replace(/\[\/?ch\]/g, "")).join(" ")

    return chords

  } catch {
    return null
  }
}

async function run() {
  const songs = await prisma.song.findMany({
  where: {
    category: "strane",
    OR: [
      { chords: null },
      { chords: "" }
    ]
  },
  orderBy: { id: "desc" },
  take: 50
})

  console.log("FOUND:", songs.length)

  for (const song of songs) {
    console.log("TRY:", song.title)

    const chords = await fetchChords(song.artistName, song.title)

    if (!chords) {
      console.log("NO CHORDS")
      continue
    }

    await prisma.song.update({
      where: { id: song.id },
      data: { chords }
    })

    console.log("UPDATED:", song.title)
  }

  await prisma.$disconnect()
}

run()