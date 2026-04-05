const fs = require("fs")
const path = require("path")
const puppeteer = require("puppeteer")

const OUTPUT = "./scripts/echords_stageFinale"
const BASE = "https://www.e-chords.com"
const ARTIST = "metallica"

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function run() {
  const browser = await puppeteer.launch({
  headless: false,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
})
  const page = await browser.newPage()

  const artistUrl = `${BASE}/chords/${ARTIST}`
  await page.goto(artistUrl, { waitUntil: "networkidle2" })
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36")

  const artistName = ARTIST.replace(/-/g, " ")
  const artistDir = path.join(OUTPUT, artistName)
  ensureDir(artistDir)

  const links = await page.$$eval("a", (els, artist) =>
  els
    .map(el => el.href)
    .filter(h => h.includes(`/chords/${artist}/`) && h.split("/").length > 5),
  ARTIST
)

  for (const link of links) {
    try {
      await page.goto(link, { waitUntil: "networkidle2" })
      await page.waitForSelector("pre, .cifra_cnt, .tab-content", { timeout: 10000 })

      const title = await page.$eval("h1", el => el.innerText)
      const content = await page.$eval("pre, .cifra_cnt, .tab-content", el => el.innerText)


      if (!title || !content) continue

      const fileName = `${artistName} - ${title}.txt`
      const filePath = path.join(artistDir, fileName)

      fs.writeFileSync(filePath, content)

      console.log("✔", fileName)

      await new Promise(r => setTimeout(r, 1500))
    } catch {
      console.log("❌ fail")
    }
  }

  await browser.close()
}

run()