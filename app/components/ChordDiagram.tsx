"use client"

type Props = {
  frets: number[]
}

export default function ChordDiagram({ frets }: Props) {
  return (
    <div className="w-[80px] h-[110px] bg-gradient-to-b from-amber-700 to-amber-900 rounded-md p-1 relative">
      
      {/* strings */}
      <div className="absolute inset-0 flex justify-between px-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-[2px] bg-gray-300 opacity-80" />
        ))}
      </div>

      {/* frets */}
      <div className="absolute inset-0 flex flex-col justify-between py-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-[2px] bg-gray-200 opacity-70" />
        ))}
      </div>

      {/* dots */}
      {frets.map((fret, i) => {
        if (fret <= 0) return null

        return (
          <div
            key={i}
            className="absolute w-3 h-3 bg-white rounded-full"
            style={{
              left: `${i * 14 + 6}px`,
              top: `${fret * 16}px`,
            }}
          />
        )
      })}
    </div>
  )
}