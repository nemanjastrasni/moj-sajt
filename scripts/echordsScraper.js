const fs = require("fs")
const path = require("path")
const axios = require("axios")
const cheerio = require("cheerio")

const OUTPUT = "../echords_stageFinale"
const BASE = "https://www.e-chords.com"

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function getArtists() {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("")
  const artists = []

  for (const letter of letters) {
    const url = `${BASE}/chords/${letter}`
    try {
      const { data } = await axios.get(url, {
  headers: {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9"
  }
})
      const $ = cheerio.load(data)

      $("a").each((i, el) => {
        const href = $(el).attr("href")
        if (href && href.startsWith("/chords/") && href.split("/").length === 3) {
          artists.push(href)
        }
      })

      console.log("✔ letter:", letter)
      await sleep(1500)
    } catch (e) {
      console.log("❌ letter fail:", letter)
    }
  }

  return [...new Set(artists)]
}

async function scrapeArtist(href) {
  const artistSlug = href.split("/")[2]
  const artistName = artistSlug.replace(/-/g, " ")
  const artistDir = path.join(OUTPUT, artistName)

  ensureDir(artistDir)

  const { data } = await axios.get(BASE + href)
  const $ = cheerio.load(data)

  const links = []

  $("a").each((i, el) => {
    const h = $(el).attr("href")
    if (h && h.includes(`/chords/${artistSlug}/`)) {
      links.push(h)
    }
  })

  for (const link of links) {
    const songUrl = link.startsWith("http") ? link : BASE + link

    try {
      const { data: songHtml } = await axios.get(songUrl)
      const $$ = cheerio.load(songHtml)

      const title = $$("h1").text().trim()
      const content = $$(".cifra_cnt").text().trim()

      if (!title || !content) continue

      const fileName = `${artistName} - ${title}.txt`
      const filePath = path.join(artistDir, fileName)

      fs.writeFileSync(filePath, content)

      console.log("✔", fileName)

      await sleep(400)
    } catch {
      console.log("❌ song fail")
    }
  }
}

async function run() {
  ensureDir(OUTPUT)

  const artists = await getArtists()

  for (const artist of artists) {
    try {
      await scrapeArtist(artist)
      await sleep(500)
    } catch {
      console.log("❌ artist fail:", artist)
    }
  }

  console.log("DONE")
}
async function fetchWithRetry(url, tries = 3) {
  try {
    return await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    })
  } catch (e) {
    if (tries === 0) throw e
    await sleep(2000)
    return fetchWithRetry(url, tries - 1)
  }
}

run()