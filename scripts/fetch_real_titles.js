const axios = require("axios")
const fs = require("fs")
const artists = require("./artists_seed.js")

async function fetchSongs(artist) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artist)}`
    await axios.get(url) // samo da proveri da postoji

    // fallback: fake ali real-like (kasnije upgrade)
    return [
      artist + " Song 1",
      artist + " Song 2",
      artist + " Song 3"
    ]
  } catch {
    return []
  }
}

async function run() {
  const results = []

  for (const artist of artists) {
    console.log("ARTIST:", artist)

    const songs = await fetchSongs(artist)

    for (const title of songs) {
      results.push({
        artist,
        title,
        text: ""
      })
    }
  }

  fs.writeFileSync(
    "C:/DEV/moj-sajt/strane_raw/real_titles.json",
    JSON.stringify(results, null, 2)
  )

  console.log("DONE:", results.length)
}

run()