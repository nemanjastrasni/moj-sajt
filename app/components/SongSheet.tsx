"use client"

import { useEffect, useRef, useState } from "react"
import Chord from "./Chord"
import { transposeChordSymbol } from "@/lib/chords/chordSymbols"
import { groupSheetLines, wrapSheetBlock, type SheetLine } from "@/lib/chords/songSheet"

type Props = {
  lines: SheetLine[]
  transpose: number
  textSize: number
  chordSize: number
}

export default function SongSheet({ lines, transpose, textSize, chordSize }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [columns, setColumns] = useState(80)

  useEffect(() => {
    const sheet = sheetRef.current
    const measure = measureRef.current
    if (!sheet || !measure) return
    const update = () => {
      const characterWidth = measure.getBoundingClientRect().width / 10
      if (characterWidth) setColumns(Math.max(8, Math.floor((sheet.clientWidth - 2) / characterWidth)))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(sheet)
    void document.fonts.ready.then(update)
    return () => observer.disconnect()
  }, [textSize])

  return (
    <div
      ref={sheetRef}
      className="relative min-w-0 max-w-full font-mono"
      style={{ fontSize: textSize, letterSpacing: 0, fontVariantLigatures: "none" }}
      data-song-sheet
    >
      <span ref={measureRef} aria-hidden="true" className="pointer-events-none absolute invisible whitespace-pre">0000000000</span>
      {groupSheetLines(lines).map((block, blockIndex) => {
        if (block.lyricLine?.kind === "tab") {
          return <pre key={blockIndex} className="m-0 max-w-full overflow-x-auto whitespace-pre" style={{ font: "inherit", lineHeight: 1.65 }}>{block.lyricLine.text}</pre>
        }

        return (
          <div key={blockIndex} data-song-block>
            {wrapSheetBlock(block, columns).map(({ start, end }) => {
              const tokens = block.chordLine?.tokens.filter((token) => token.start >= start && token.start < end) ?? []
              let chordText = block.chordLine?.text.slice(start, end) ?? ""
              for (const token of tokens) {
                const local = token.start - start
                chordText = chordText.slice(0, local) + " ".repeat(token.end - token.start) + chordText.slice(token.end - start)
              }
              const displayedTokens = tokens.map((token, index) => {
                const symbol = transposeChordSymbol(token.chord, transpose)
                const limit = tokens[index + 1]?.start ?? start + Math.max(columns, end - start)
                const size = Math.min(chordSize, Math.max(1, (limit - token.start) * textSize / symbol.length))
                return { token, symbol, size }
              })

              return (
                <div key={start} className="max-w-full overflow-x-auto" data-song-pair>
                  {block.chordLine && (
                    <div className="relative whitespace-pre" style={{ height: Math.max(textSize, chordSize) * 1.65, minWidth: `${end - start}ch` }} data-chord-row>
                      {Array.from(chordText.matchAll(/\S+/g), (match) => {
                        const previous = displayedTokens.filter(({ token }) => token.end - start <= match.index!).at(-1)
                        const left = Math.max(match.index!, previous ? previous.token.start - start + previous.symbol.length * previous.size / textSize + 0.15 : 0)
                        return <span key={`text-${match.index}`} className="absolute top-0 inline-flex h-full items-center" style={{ left: `${left}ch`, lineHeight: 1 }}>{match[0]}</span>
                      })}
                      {displayedTokens.map(({ token, symbol, size }) => {
                        const localColumn = token.start - start
                        return (
                          <span key={token.start} className="absolute top-0 inline-flex h-full items-center" style={{ left: `${localColumn}ch`, lineHeight: 1 }} data-chord-column={localColumn}>
                            {token.bass
                              ? <span className="text-blue-500" style={{ fontSize: size }} data-bass-note>{symbol}</span>
                              : <Chord chord={symbol} size={size} />}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {block.lyricLine && (
                    <div className="whitespace-pre" style={{ minHeight: textSize * 1.65, lineHeight: 1.65 }} data-lyric-row>
                      {block.lyricLine.text.slice(start, end) || "\u00a0"}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
