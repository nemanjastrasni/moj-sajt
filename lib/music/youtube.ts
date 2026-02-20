export async function searchYouTubeTrack(
  artist: string,
  title: string
) {
  const query = `${artist} ${title} official audio`

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&q=${encodeURIComponent(
      query
    )}&key=${process.env.YOUTUBE_API_KEY}`
  )

  const data = await res.json()

  if (!data.items?.length) return null

  const video = data.items[0]

  return {
    platform: "youtube",
    embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`,
  }
}