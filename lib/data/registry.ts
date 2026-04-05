import fs from "fs"
import path from "path"

/* =========================
   OSNOVNI TIPOVI
========================= */

export type Song = {
  id: string
  slug: string
  title: string
  content: string
}

export type Discography =
  | string[]
  | {
      studio?: { title: string; year?: number }[]
      live?: { title: string; year?: number }[]
      compilations?: { title: string; year?: number }[]
      tribute?: { title: string; year?: number }[]
    }

export type Artist = {
  category: string
  slug: string
  artistFull: string
  image?: string
  bio?: string
  discography?: Discography
  songs: Song[]
}

/* =========================
   INTERNI TIP ZA FAJL
========================= */

type ArtistFile = {
  artistFull: string
  image?: string
  bio?: string
  discography?: Discography
  songs: Song[]
}

/* =========================
   PUTANJA
========================= */

const domacePath = path.join(process.cwd(), "lib/data/domace")

/* =========================
   GET ARTISTS
========================= */

export function getArtists(): Artist[] {
  const files = fs.readdirSync(domacePath)

  return files.map((file) => {
    const slug = file.replace(".ts", "")

    const artistModule = require(`./domace/${slug}`)
    const artistData = artistModule.default as ArtistFile

    return {
      category: "domace",
      slug,
      artistFull: artistData.artistFull,
      image: artistData.image,
      bio: artistData.bio,
      discography: artistData.discography,
      songs: artistData.songs,
    }
  })
}

/* =========================
   PROŠIRENI TIP ZA PESMU
========================= */

export type SongWithMeta = Song & {
  artist: string
  artistFull: string
  category: string
}

/* =========================
   GET ALL SONGS
========================= */

export function getAllSongs(): SongWithMeta[] {
  return getArtists().flatMap((artist) =>
    artist.songs.map((song) => ({
      ...song,
      artist: artist.slug,
      artistFull: artist.artistFull,
      category: artist.category,
    }))
  )
}