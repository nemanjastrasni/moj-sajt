export async function searchYouTubeTrack(
  artist: string,
  title: string
) {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    console.error("❌ Missing YOUTUBE_API_KEY")
    return null
  }

  const query = `${artist} ${title} official audio`

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&type=video` +
      `&maxResults=5` +
      `&videoEmbeddable=true` +
      `&q=${encodeURIComponent(query)}` +
      `&key=${apiKey}`

    const res = await fetch(url, {
      cache: "no-store",
    })

    if (!res.ok) {
      console.error("❌ YouTube API error:", res.status)
      return null
    }

    const data = await res.json()

    if (!data?.items?.length) {
      console.log("⚠️ No YouTube results")
      return null
    }

    const video = data.items.find(
      (item: any) => item?.id?.videoId
    )

    if (!video?.id?.videoId) {
      console.log("⚠️ No valid videoId found")
      return null
    }

    const videoId = video.id.videoId

    return {
      platform: "youtube",
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    }
  } catch (err) {
    console.error("❌ YouTube search error:", err)
    return null
  }
}