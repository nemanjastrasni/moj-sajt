const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")

const artists = require("./artists_seed.js")

const MAX_SONGS_PER_ARTIST = 30

async function scrapeArtist(artist) {
  const query = encodeURIComponent(`${artist} chords site:chordie.com`)

  const url = `https://www.google.com/search?q=${query}`

  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const $ = cheerio.load(res.data)
    const links = []

    $("a").each((i, el) => {
      const href = $(el).attr("href")

      if (href && href.includes("chordie.com/chord.p")) {
        const clean = href.split("/url?q=")[1]?.split("&")[0]
        if (clean) links.push(clean)
      }
    })

    return links.slice(0, MAX_SONGS_PER_ARTIST)

  } catch (err) {
    console.log("FAIL ARTIST:", artist)
    return []
  }
}

async function scrapeSong(url, artist) {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const $ = cheerio.load(res.data)
    const pre = $("pre").text()

    if (!pre || pre.length < 200) return null

    const title = $("title").text().split(" - ")[0]

    return {
      artist,
      title,
      text: pre
    }

  } catch {
    return null
  }
}

async function run() {
  const results = []

  for (const artist of artists) {
    console.log("ARTIST:", artist)

    const links = await scrapeArtist(artist)

    for (const link of links) {
      const song = await scrapeSong(link, artist)

      if (song) {
        results.push(song)
        console.log("✔", song.title)
      }
    }
  }

  fs.writeFileSync(
    "C:/DEV/moj-sajt/strane_raw/scraped.json",
    JSON.stringify(results, null, 2)
  )

  console.log("DONE:", results.length)
}

run()