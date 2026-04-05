import { searchSpotifyTrack } from "./spotify"
import { searchYouTubeTrack } from "./youtube"
import { getFromCache, setToCache } from "./cache"

export async function resolveMusic(artist: string, title: string) {
  const key = `${artist}-${title}`.toLowerCase().trim()

  console.log("🔎 Resolving:", key)

  // 1️⃣ Cache
  const cached = getFromCache(key)
  if (cached) {
    console.log("✅ From cache")
    return cached
  }

  let result = null

  // 2️⃣ YouTube
  try {
    result = await searchYouTubeTrack(artist, title)
    console.log("📺 YouTube result:", result)
  } catch (err) {
    console.log("❌ YouTube error:", err)
  }

  // 3️⃣ Spotify fallback
  if (!result) {
    try {
      result = await searchSpotifyTrack(artist, title)
      console.log("🎵 Spotify result:", result)
    } catch (err) {
      console.log("❌ Spotify error:", err)
    }
  }

  // 4️⃣ Cache upis
  if (result) {
    setToCache(key, result)
    console.log("💾 Cached")
  }

  return result
}