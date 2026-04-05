const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search"

let accessToken: string | null = null
let tokenExpires = 0

async function getSpotifyToken() {
  if (accessToken && Date.now() < tokenExpires) {
    return accessToken
  }

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: "grant_type=client_credentials",
  })

  const data = await res.json()

  accessToken = data.access_token
  tokenExpires = Date.now() + data.expires_in * 1000

  return accessToken
}

export async function searchSpotifyTrack(
  artist: string,
  title: string
) {
  const token = await getSpotifyToken()

  const query = `track:"${title}" artist:"${artist}"`

  const res = await fetch(
    `${SPOTIFY_SEARCH_URL}?q=${encodeURIComponent(query)}&type=track&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data = await res.json()

  if (!data.tracks?.items?.length) return null

  const track = data.tracks.items[0]

  return {
    platform: "spotify",
    embedUrl: `https://open.spotify.com/embed/track/${track.id}`,
  }
}