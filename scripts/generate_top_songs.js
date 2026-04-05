const fs = require("fs")
const artists = require("./artists_seed.js")

const SONGS_PER_ARTIST = 30

const commonTitles = [
  "Love", "Home", "Stay", "Dream", "Fire", "Light", "Night",
  "Heart", "Time", "World", "Life", "Girl", "Boy", "Dance",
  "Rain", "Sky", "Road", "Mind", "Soul", "Run"
]

function generateTitle(i) {
  const word = commonTitles[i % commonTitles.length]
  return word + " " + (i + 1)
}

const results = []

for (const artist of artists) {
  for (let i = 0; i < SONGS_PER_ARTIST; i++) {
    results.push({
      artist,
      title: generateTitle(i),
      text: "C G Am F\nLyrics..."
    })
  }
}

fs.writeFileSync(
  "C:/DEV/moj-sajt/strane_raw/top_songs.json",
  JSON.stringify(results, null, 2)
)

console.log("DONE:", results.length)