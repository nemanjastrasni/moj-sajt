export function parseMusicUrl(url: string) {
  // YOUTUBE
  const ytMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)

  if (ytMatch) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
    }
  }

  // SPOTIFY
  const spMatch =
    url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)

  if (spMatch) {
    return {
      type: "spotify",
      embedUrl: `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}`,
    }
  }

  // SOUNDCLOUD
  if (url.includes("soundcloud.com")) {
    return {
      type: "soundcloud",
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`,
    }
  }

  // BANDCAMP
  if (url.includes("bandcamp.com")) {
    return {
      type: "bandcamp",
      embedUrl: url, // Bandcamp koristi direktan embed
    }
  }

  // MIXCLOUD
  if (url.includes("mixcloud.com")) {
    return {
      type: "mixcloud",
      embedUrl: `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(url)}`,
    }
  }

  return null
}