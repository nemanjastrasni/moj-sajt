import { PDFDocument, PageSizes, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import { transposeChordSymbol } from "../chords/chordSymbols"
import { capoSheet, isCapo } from "../chords/capo"
import { parseSongSheet } from "../chords/songSheet"
import { MAX_BOOK_SONGS, MAX_PDF_CHARACTERS, type PdfSong } from "./model"
import { printBlocks } from "./layout"

export type PdfOptions = { title: string; fontSize: number; chordSize?: number; book: boolean; contents: boolean; locale: "sr" | "en" }
export type PdfFonts = { regular: Uint8Array; bold: Uint8Array }
const MARGIN = 44, BOTTOM = 62, MAX_PAGES = 500
const [WIDTH, HEIGHT] = PageSizes.A4
const ROOM = WIDTH - MARGIN * 2

function text(value: string) { return value.normalize("NFC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\uFEFF]/g, "") }
export function wrapPdfText(value: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []
  let current = ""
  for (const character of text(value).replace(/\s+/g, " ").trim()) {
    const next = current + character
    if (current && font.widthOfTextAtSize(next, size) > width) {
      const space = current.lastIndexOf(" ")
      if (space > current.length / 2) { lines.push(current.slice(0, space)); current = current.slice(space + 1) + character }
      else { lines.push(current); current = character === " " ? "" : character }
    } else current = next
  }
  if (current) lines.push(current.trimEnd())
  return lines.length ? lines : [""]
}

export async function generateSongbookPdf(songs: PdfSong[], options: PdfOptions, fonts: PdfFonts, progress?: (done: number) => void) {
  if (!songs.length || songs.length > MAX_BOOK_SONGS || songs.some(song => typeof song.lyrics !== "string" || !song.lyrics.trim() || song.lyrics.length > 100000 || typeof song.title !== "string" || !song.title || song.title.length > 400 || typeof song.artist !== "string" || song.artist.length > 400 || !Number.isInteger(song.transpose) || Math.abs(song.transpose) > 11) || songs.reduce((n, s) => n + s.lyrics.length, 0) > MAX_PDF_CHARACTERS) throw new Error("Izaberi od 1 do 100 pesama sa tekstom.")
  if (!Number.isFinite(options.fontSize) || options.fontSize < 8 || options.fontSize > 24 || !Number.isFinite(options.chordSize ?? options.fontSize) || (options.chordSize ?? options.fontSize) < 8 || (options.chordSize ?? options.fontSize) > 24) throw new Error("Proveri velicinu teksta.")
  if (songs.some(song => song.capo !== undefined && !isCapo(song.capo))) throw new Error("Neispravan capo prag.")
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const regular = await doc.embedFont(fonts.regular, { subset: true }), bold = await doc.embedFont(fonts.bold, { subset: true })
  const supported = new Set(regular.getCharacterSet()), supportedBold = new Set(bold.getCharacterSet())
  const en = options.locale === "en", title = text(options.title).slice(0, 120)
  doc.setTitle(title); doc.setCreator("GitaraAkordi"); doc.setLanguage(en ? "en" : "sr-Latn")
  function page() {
    if (doc.getPageCount() >= MAX_PAGES) throw new Error("Knjiga ima previse stranica. Izaberi manje pesama ili manji tekst.")
    return doc.addPage(PageSizes.A4)
  }
  function draw(p: PDFPage, value: string, x: number, top: number, size: number, heavy = false, gray = 0.08) {
    const clean = text(value), characters = heavy ? supportedBold : supported
    for (const char of clean) if (!characters.has(char.codePointAt(0)!)) throw new Error(`PDF ne podrzava znak U+${char.codePointAt(0)!.toString(16).toUpperCase()}.`)
    if (clean) p.drawText(clean, { x, y: top - size, size, font: heavy ? bold : regular, color: rgb(gray, gray, gray) })
  }
  function paragraph(p: PDFPage, value: string, y: number, size: number, heavy = false) {
    for (const line of wrapPdfText(value, heavy ? bold : regular, size, ROOM)) { draw(p, line, MARGIN, y, size, heavy); y -= size * 1.35 }
    return y
  }
  if (options.book) {
    const cover = page()
    let y = paragraph(cover, title, HEIGHT - 170, 28, true)
    y = paragraph(cover, "GitaraAkordi", y - 24, 14)
    paragraph(cover, `${songs.length} ${en ? "songs" : "pesama"}`, y - 12, 11)
  }
  const contentsPages: { page: PDFPage; entries: { index: number; lines: string[]; top: number }[] }[] = []
  if (options.book && options.contents) {
    let current = { page: page(), entries: [] as { index: number; lines: string[]; top: number }[] }, y = HEIGHT - MARGIN - 42
    contentsPages.push(current)
    songs.forEach((song, index) => {
      const lines = wrapPdfText(`${index + 1}. ${song.title} - ${song.artist}`, regular, 10, ROOM - 48)
      const height = lines.length * 14 + 10
      if (y - height < BOTTOM) { current = { page: page(), entries: [] }; contentsPages.push(current); y = HEIGHT - MARGIN - 42 }
      current.entries.push({ index, lines, top: y }); y -= height
    })
  }
  const songPages: { id: string; page: number }[] = []
  const fontSize = options.fontSize, chordSize = options.chordSize ?? fontSize
  const unit = regular.widthOfTextAtSize("M", fontSize), rowHeight = Math.max(fontSize, chordSize) * 1.45
  const columns = Math.max(16, Math.floor(ROOM / unit) - 3)
  for (const [index, song] of songs.entries()) {
    const display = capoSheet(parseSongSheet(text(song.lyrics)), song.transpose, song.capo ?? null)
    if (song.capo !== undefined && !display.active) throw new Error("Oznaka capoa u izvornom zapisu nije jasna. Preporuka nije dostupna.")
    let current = page()
    songPages.push({ id: song.id, page: doc.getPageCount() })
    function header(continued: boolean) {
      let y = HEIGHT - MARGIN
      y = paragraph(current, song.title, y, continued ? 12 : 20, true)
      y = paragraph(current, song.artist, y - 6, continued ? 9 : 11)
      const note = song.transpose ? `${en ? "Transpose" : "Transpozicija"}: ${song.transpose > 0 ? "+" : ""}${song.transpose}` : en ? "Original key" : "Originalni tonalitet"
      const capoNote = display.active ? ` | Capo ${display.fret} (${en ? "chord shapes" : "hvatovi"})` : ""
      y = paragraph(current, note + capoNote + (continued ? en ? " - Continued" : " - Nastavak" : ""), y - 7, 8)
      if (display.active && display.lines.some(line => line.kind === "tab")) y = paragraph(current, en ? "Tablature remains as originally written." : "Tabulatura ostaje u izvornom zapisu.", y - 2, 8)
      current.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: WIDTH - MARGIN, y: y - 8 }, thickness: 0.5, color: rgb(.75, .75, .75) })
      return y - 24
    }
    let y = header(false)
    const blocks = printBlocks(display.lines, columns)
    for (const [blockIndex, block] of blocks.entries()) {
      const height = block.rows.length * rowHeight + 2
      const nextHeight = block.section && blocks[blockIndex + 1] ? blocks[blockIndex + 1].rows.length * rowHeight : 0
      if (y - height - nextHeight < BOTTOM) { current = page(); y = header(true) }
      // Exceptionally long source tokens fit by scaling this block, not by clipping.
      const widest = Math.max(1, ...block.rows.map(row => regular.widthOfTextAtSize(row.text, fontSize)))
      const scale = Math.min(1, ROOM / widest), cell = unit * scale
      for (const row of block.rows) {
        if (row.kind === "chords") {
          let residual = row.text
          for (const token of row.tokens) residual = residual.slice(0, token.start) + " ".repeat(token.end - token.start) + residual.slice(token.end)
          draw(current, residual, MARGIN, y, fontSize * scale)
          row.tokens.forEach((token, tokenIndex) => {
            const symbol = transposeChordSymbol(token.chord, display.shift)
            const right = Math.min(ROOM, (row.tokens[tokenIndex + 1]?.start ?? columns + 3) * cell)
            const available = Math.max(cell * .5, right - token.start * cell - cell * .55)
            const size = Math.min(chordSize * scale, available / bold.widthOfTextAtSize(symbol, 1))
            draw(current, symbol, MARGIN + token.start * cell, y, size, true)
          })
        } else draw(current, row.text, MARGIN, y, fontSize * scale)
        y -= rowHeight
      }
      y -= 2
    }
    progress?.(index + 1)
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  for (const contents of contentsPages) {
    draw(contents.page, en ? "Contents" : "Sadrzaj", MARGIN, HEIGHT - MARGIN, 20, true)
    for (const entry of contents.entries) {
      const target = songPages[entry.index].page
      entry.lines.forEach((line, i) => draw(contents.page, line, MARGIN, entry.top - i * 14, 10))
      const label = String(target)
      draw(contents.page, label, WIDTH - MARGIN - regular.widthOfTextAtSize(label, 10), entry.top, 10, true)
      const annotation = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [MARGIN, entry.top - entry.lines.length * 14, WIDTH - MARGIN, entry.top + 2], Border: [0, 0, 0], Dest: [doc.getPage(target - 1).ref, "Fit"] })
      contents.page.node.addAnnot(doc.context.register(annotation))
    }
  }
  doc.getPages().forEach((p, index) => {
    const footer = `${index + 1} / ${doc.getPageCount()}`
    draw(p, "GitaraAkordi", MARGIN, 34, 8, false, .4)
    draw(p, footer, WIDTH - MARGIN - regular.widthOfTextAtSize(footer, 8), 34, 8, false, .4)
  })
  return { bytes: await doc.save(), pageCount: doc.getPageCount(), songPages }
}
