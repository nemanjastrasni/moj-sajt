const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")
const path = require("path")

const OUT_DIR = "C:/DEV/scraper/strane_raw"

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

const urls = [
  "https://www.azchords.com/p/pinkfloyd-tabs-112/comfortablynumb-tabs-17438.html",
  "https://www.azchords.com/l/ledzeppelin-tabs-239/stairwaytoheaven-tabs-28633.html",
  "https://www.azchords.com/b/bobdylan-tabs-108/knockinonheavensdoor-tabs-12112.html"
]

function cleanFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim()
}

async function run() {
  for (const url of urls) {
    try {
      const res = await axios.get(url, {
  headers: {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
  },
})
      const $ = cheerio.load(res.data)
      

      let content = $("pre").text()

if (!content || content.length < 100) {
  content = $("body").text()
}

if (!content || content.length < 100) {
  content = $(".tab").text() || $("#tab").text()
}

      if (!content || content.length < 100) {
        console.log("SKIP:", url)
        continue
      }

      let title = $("title").text().split("-")[0].trim()
      let artist = $("title").text().split("-")[1]?.trim() || "Unknown"

      const fileName = cleanFileName(`${artist} - ${title}`)
      const filePath = path.join(OUT_DIR, fileName + ".txt")

      fs.writeFileSync(filePath, content)

      console.log("SAVED:", fileName)
    } catch (err) {
      console.log("ERROR:", url)
    }
  }
}

run()
