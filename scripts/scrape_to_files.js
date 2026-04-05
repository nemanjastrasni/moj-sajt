const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")
const path = require("path")

const artists = require("./artists_seed.js")

const OUT_DIR = "C:/DEV/moj-sajt/strane_raw_txt"

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

function cleanName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim()
}

// ✅ scrape pojedinačne pesme
async function scrapeSong(url, artist) {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const $ = cheerio.load(res.data)

    let content = $("pre").text()

    if (!content || content.length < 200) {
      content = $("body").text()
    }

    if (!content || content.length < 200) return null

    const title = $("title").text().split("-")[0].trim()

    return {
      artist,
      title,
      text: content
    }

  } catch {
    return null
  }
}

// ✅ NOVO — scrape artist stranice (BEZ search)
async function scrapeArtist(artist) {
  const slug = artist.toLowerCase().replace(/\s+/g, "-")

  const urls = [
    `https://www.guitaretab.com/${slug}/`,
    `https://www.guitaretab.com/${slug}/tabs/`
  ]

  let links = []

  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      })

      const $ = cheerio.load(res.data)

      $("a").each((i, el) => {
        const href = $(el).attr("href")

        if (href && href.includes(".html")) {
          links.push("https://www.guitaretab.com" + href)
        }
      })

    } catch {}
  }

  return links.slice(0, 5)
}

// ✅ MAIN
async function run() {
  let count = 0

  for (const artist of artists) {
    console.log("ARTIST:", artist)

    const links = await scrapeArtist(artist)

    for (const link of links) {
      const song = await scrapeSong(link, artist)

      if (!song) continue

      const fileName = cleanName(`${song.artist} - ${song.title}.txt`)
      const filePath = path.join(OUT_DIR, fileName)

      fs.writeFileSync(filePath, song.text)

      console.log("SAVED:", fileName)
      count++
    }
  }

  console.log("DONE:", count)
}

run()