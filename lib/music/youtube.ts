export async function searchYouTubeTrack(
  artist: string,
  title: string
) {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    console.error("Missing YOUTUBE_API_KEY")
    return null
  }

  const query = `${artist} ${title}`

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&type=video` +
      `&maxResults=8` +
      `&videoEmbeddable=true` +
      `&q=${encodeURIComponent(query)}` +
      `&key=${apiKey}`

    const res = await fetch(url, { cache: "no-store" })

    if (!res.ok) {
      console.error("YouTube API error:", res.status)
      return null
    }

    const data = await res.json()
    if (!data?.items?.length) return null

    const videos = data.items.filter((item: any) => item?.id?.videoId)

    const blacklist = [
      "live",
      "cover",
      "remix",
      "karaoke",
      "instrumental",
      "reaction",
      "acoustic",
      "concert"
    ]

    const priorityWords = [
      "official video",
      "official audio",
      "official",
      "lyrics"
    ]

    const scored = videos
      .map((video: any) => {
        const t = video.snippet.title.toLowerCase()

        let score = 0

        // ❌ Kazna za blacklist (ali ne izbacujemo odmah — samo penal)
        blacklist.forEach(word => {
          if (t.includes(word)) score -= 10
        })

        // ✅ Prioritetne reči
        priorityWords.forEach(word => {
          if (t.includes(word)) score += 5
        })

        // ✅ Ako sadrži ime izvođača
        if (t.includes(artist.toLowerCase())) score += 3

        // ✅ Ako sadrži naziv pesme
        if (t.includes(title.toLowerCase())) score += 3

        // Mala kazna ako je predugačak naslov (često clickbait)
        if (t.length > 80) score -= 1

        return { video, score }
      })
      .sort((a: any, b: any) => b.score - a.score)

    const best = scored[0]?.video
    if (!best?.id?.videoId) return null

    return {
      platform: "youtube",
      embedUrl: `https://www.youtube.com/embed/${best.id.videoId}`,
    }

  } catch (err) {
    console.error("YouTube search error:", err)
    return null
  }
}