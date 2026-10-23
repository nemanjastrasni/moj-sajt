const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")
const cheerio = require("cheerio")
const sharp = require("sharp")
const { chordParserFactory } = require("chord-symbol/lib/chord-symbol.js")

const parseChord = chordParserFactory({ notationSystems: ["english"] })
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const tuning = [40, 45, 50, 55, 59, 64]
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex")
const project = path.join(__dirname, "..")
const targets = [
  { symbol: "E7/B", root: "e", quality: "7", index: 2, file: "E7_b_v1.png", frets: [7, 7, 9, 7, 9, 7] },
  { symbol: "D7/F#", root: "d", quality: "7", index: 0, file: "D7_f#_v1.png", frets: [2, -1, 0, 2, 1, 2], edit: "add-low-f-sharp" },
  { symbol: "Em7/B", root: "e", quality: "m7", index: 5, file: "Em7_b_v1.png", frets: [7, 7, 9, 7, 8, 7] },
  { symbol: "D7/A", root: "d", quality: "7", index: 2, file: "D7_a_v1.png", frets: [5, 5, 7, 5, 7, 5] },
  { symbol: "B7/F#", root: "b", quality: "7", index: 1, file: "B7_f#_v1.png", frets: [2, 2, 4, 2, 4, 2] },
  { symbol: "G7/B", root: "g", quality: "7", index: 0, file: "G7_b_v1.png", frets: [-1, 2, 0, 0, 0, 1], edit: "mute-low-e-string" },
]

function inspectSvg(markup) {
  const $ = cheerio.load(markup, { xmlMode: true })
  const board = $("svg > rect").first()
  const top = Number(board.attr("y"))
  const strings = $("svg > rect").toArray()
    .filter((element) => Number($(element).attr("height")) > 80 && Number($(element).attr("width")) < 2)
    .map((element) => Number($(element).attr("x")) + Number($(element).attr("width")) / 2).sort((a, b) => a - b)
  if (strings.length !== 6) throw new Error("Expected six strings in source SVG")
  const horizontal = $("svg > rect").toArray()
    .filter((element) => Number($(element).attr("width")) > 60 && Number($(element).attr("height")) < 5)
    .map((element) => Number($(element).attr("y"))).sort((a, b) => a - b)
  const base = Number($("text").toArray().map((element) => $(element).text()).find((text) => /fr/.test(text))?.replace(/\D/g, "")) || 1
  const step = horizontal.at(-1) - horizontal.at(-2)
  const stringIndex = (x) => strings.reduce((best, candidate, index) => Math.abs(candidate - x) < Math.abs(strings[best] - x) ? index : best, 0)
  const frets = Array(6).fill(-1)
  for (const element of $("circle").toArray()) {
    const marker = $(element), x = Number(marker.attr("cx")), y = Number(marker.attr("cy"))
    if (marker.attr("fill") === "none" && y < top) frets[stringIndex(x)] = 0
    else if (y > top) frets[stringIndex(x)] = base + Math.floor((y - top) / step)
  }
  for (const element of $("g > rect[rx]").toArray()) {
    const marker = $(element), x = Number(marker.attr("x")), y = Number(marker.attr("y"))
    const fret = base + Math.floor((y + Number(marker.attr("height")) / 2 - top) / step)
    strings.forEach((position, index) => {
      if (position >= x && position <= x + Number(marker.attr("width"))) frets[index] = Math.max(frets[index], fret)
    })
  }
  return { $, top, strings, base, step, frets }
}

function adaptSvg(source, edit) {
  if (!edit) return source
  const { $, strings, top, base, step } = inspectSvg(source)
  const lowString = strings[0]
  for (const element of $("svg > circle").toArray()) {
    if (Math.abs(Number($(element).attr("cx")) - lowString) < 1) $(element).remove()
  }
  for (const element of $("svg > g").toArray()) {
    const group = $(element)
    const circle = group.children("circle").first()
    const crossedLine = group.children("line").first()
    if ((circle.length && Math.abs(Number(circle.attr("cx")) - lowString) < 1) ||
      (crossedLine.length && Number(crossedLine.attr("y1")) < top && Math.abs((Number(crossedLine.attr("x1")) + Number(crossedLine.attr("x2"))) / 2 - lowString) < 1)) group.remove()
  }
  if (edit === "mute-low-e-string") {
    const radius = 4.239375, y = 36.25
    $("svg").append(`<g><line x1="${lowString - radius}" y1="${y - radius}" x2="${lowString + radius}" y2="${y + radius}" stroke="#f3f3f3" stroke-width="1.5"/><line x1="${lowString + radius}" y1="${y - radius}" x2="${lowString - radius}" y2="${y + radius}" stroke="#f3f3f3" stroke-width="1.5"/></g>`)
  } else if (edit === "add-low-f-sharp") {
    const reference = $("svg > g").toArray().find((element) => {
      const circle = $(element).children("circle").first()
      return circle.length && base + Math.floor((Number(circle.attr("cy")) - top) / step) === 2
    })
    if (!reference) throw new Error("Source D7 second-fret marker was not found")
    const thumb = $(reference).clone()
    thumb.children("circle").attr("cx", String(lowString))
    thumb.children("text").attr("x", String(lowString)).text("T")
    $("svg").append(thumb)
  } else throw new Error(`Unknown edit: ${edit}`)
  return $("svg").toString()
}

function validateVoicing(symbol, frets) {
  const parsed = parseChord(symbol)
  if ("error" in parsed) throw new Error(`Invalid chord: ${symbol}`)
  const pitches = frets.flatMap((fret, index) => fret < 0 ? [] : [tuning[index] + fret])
  const actual = [...new Set(pitches.map((pitch) => pitch % 12))].sort((a, b) => a - b)
  const expected = [...new Set(parsed.normalized.notes.map((note) => {
    const match = note.match(/^([A-G])([#b]?)$/)
    const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]]
    return (natural + (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0) + 12) % 12
  }))].sort((a, b) => a - b)
  if (actual.join() !== expected.join()) throw new Error(`${symbol}: source tones do not match the full chord`)
  const bass = notes[Math.min(...pitches) % 12]
  if (bass !== symbol.split("/")[1]) throw new Error(`${symbol}: lowest note is ${bass}`)
  return { bass, notes: actual.map((pitch) => notes[pitch]) }
}

async function main() {
  const pages = new Map()
  const prepared = []
  const manifestPath = path.join(__dirname, "slash-chord-image-sources.json")
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")).images : []
  for (const target of targets) {
    const url = `https://www.chorducate.com/discover/guitar/chords/${target.root}/${target.quality}`
    if (!pages.has(url)) {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${url}: ${response.status}`)
      pages.set(url, cheerio.load(await response.text()))
    }
    const page = pages.get(url)
    const element = page("svg.fretboard-svg").get(target.index)
    if (!element) throw new Error(`${target.symbol}: source voicing is unavailable`)
    const original = page.html(element)
    const adapted = adaptSvg(original, target.edit)
    const inspected = inspectSvg(adapted)
    if (inspected.frets.join() !== target.frets.join()) throw new Error(`${target.symbol}: source frets have changed`)
    const verified = validateVoicing(target.symbol, inspected.frets)
    const $ = cheerio.load(adapted, { xmlMode: true })
    const background = $("svg > rect").first().attr("fill")
    const foreground = $("svg > rect").eq(1).attr("fill")
    $("[fill], [stroke]").each((_, element) => {
      for (const attribute of ["fill", "stroke"]) {
        const color = $(element).attr(attribute)
        if (color === background) $(element).attr(attribute, "#010403")
        else if (color === foreground) $(element).attr(attribute, "#f3f3f3")
      }
    })
    // Match the existing transparent 300px charts, including the space for fret numbers.
    const viewBox = "-9.6375 28.510625 140 119.989375"
    $("svg").attr({ xmlns: "http://www.w3.org/2000/svg", width: "300", height: "300", viewBox, preserveAspectRatio: "none" }).removeAttr("style")
    $("text").each((_, element) => {
      if (/fr/.test($(element).text())) $(element).text(String(inspected.base)).attr({ x: "8", "text-anchor": "middle", fill: "#f3f3f3" })
    })
    const png = await sharp(Buffer.from($("svg").toString())).resize(300, 300).png().toBuffer()
    const destination = path.join(project, "public/chords_final", target.file)
    if (fs.existsSync(destination)) {
      const existingHash = hash(fs.readFileSync(destination))
      const owned = previous.find((item) => item.file === target.file && item.symbol === target.symbol)?.pngSha256
      if (existingHash !== hash(png) && existingHash !== owned) throw new Error(`Refusing to overwrite a different existing image: ${target.file}`)
    }
    prepared.push({ png, destination, record: {
      symbol: target.symbol, file: target.file, frets: target.frets, ...verified,
      source: url, sourceVoicingIndex: target.index, sourceSvgSha256: hash(original),
      adjustment: target.edit ?? null, cropViewBox: viewBox, pngSha256: hash(png),
    } })
  }
  for (const item of prepared) {
    fs.writeFileSync(item.destination, item.png)
    console.log(`${item.record.symbol}: ${item.record.file}, bass ${item.record.bass}, frets ${item.record.frets.map((fret) => fret < 0 ? "x" : fret).join("")}`)
  }
  fs.writeFileSync(manifestPath, JSON.stringify({
    tuning: "E2 A2 D3 G3 B3 E4",
    note: "Four voicings are taken directly from Chorducate. D7/F# and G7/B adapt source diagrams to the required bass. All six are checked against their full pitch-class set and actual lowest MIDI pitch before rasterization. T denotes the thumb.",
    images: prepared.map((item) => item.record),
  }, null, 2) + "\n")
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
module.exports = { inspectSvg, validateVoicing }
