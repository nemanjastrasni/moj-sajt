import { searchSpotifyTrack } from "./spotify"
import { searchYouTubeTrack } from "./youtube"
import { getFromCache, setToCache } from "./cache"

export async function resolveMusic(artist: string, title: string) {
  const key = `${artist}-${title}`.toLowerCase()

  const cached = getFromCache(key)
  if (cached) return cached

  let result = await searchSpotifyTrack(artist, title)

  if (!result) {
    result = await searchYouTubeTrack(artist, title)
  }

  if (result) {
    setToCache(key, result)
  }

  return result
}