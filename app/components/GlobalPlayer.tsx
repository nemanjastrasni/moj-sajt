"use client"

export default function GlobalPlayer({ url }: { url: string }) {
  if (!url) return null

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black border-t border-gray-800 p-2">
      <iframe
        src={url}
        className="w-full h-20"
        allow="autoplay"
      />
    </div>
  )
}
