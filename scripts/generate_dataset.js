const fs = require("fs")

const artists = require("./artists_seed.js")

const chords = ["C", "G", "Am", "F", "D", "Em", "A"]

function randomChords() {
  return Array.from({ length: 4 }, () => chords[Math.floor(Math.random() * chords.length)]).join(" ")
}

const songs = []

for (let i = 0; i < 10000; i++) {
  const artist = artists[Math.floor(Math.random() * artists.length)]

  const title = "Song " + i

  const text = `${randomChords()}\nLyrics line 1...\n${randomChords()}\nLyrics line 2...`

  songs.push({
    artist,
    title,
    text
  })
}

fs.writeFileSync("C:/DEV/moj-sajt/strane_raw/dataset_10k.json", JSON.stringify(songs, null, 2))

console.log("DONE 10k dataset")