import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"
import csv from "csv-parser"

const prisma = new PrismaClient()

function readCsv(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = []

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject)
  })
}

async function importArtists() {
  const artists = await readCsv(
    path.join(process.cwd(), "tabele/Artist.csv")
  )

  for (const artist of artists) {
    try {
      await prisma.artist.create({
        data: {
          id: artist.id,
          slug: artist.slug,
          name: artist.name,
          image: artist.image || null,
          bio: artist.bio || null,
          category: artist.category || null,
          bioShort: artist.bioShort || null,
        },
      })
    } catch (e) {
}
  }

  console.log("Artists imported")
}

async function importSongs() {
  const songs = await readCsv(
    path.join(process.cwd(), "tabele/Song.csv")
  )

  for (const song of songs) {
    try {
      await prisma.song.create({
        data: {
          id: song.id,
          slug: song.slug,
          title: song.title,
          category: song.category,
          lyrics: song.lyrics,
          chords: song.chords || null,
          artistId: song.artistId,
          popularity: Number(song.popularity || 0),
          difficulty: song.difficulty || "beginner",
        },
      })
    } catch (e) {
      console.log("Song skip:", song.title)
    }
  }

  console.log("Songs imported")
}

async function importUsers() {
  const users = await readCsv(
    path.join(process.cwd(), "tabele/User.csv")
  )

  for (const user of users) {
    try {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name || null,
          email: user.email || null,
          password: user.password || null,
          image: user.image || null,
          role: user.role || "user",
          bio: user.bio || null,
          city: user.city || null,
          country: user.country || null,
          banned: user.banned === "true",
          skillLevel: user.skillLevel || "beginner",
        },
      })
    } catch (e) {
      console.log("User skip:", user.email)
    }
  }

  console.log("Users imported")
}

async function importFavorites() {
  const favorites = await readCsv(
    path.join(process.cwd(), "tabele/Favorite.csv")
  )

  for (const fav of favorites) {
    try {
      await prisma.favorite.create({
        data: {
          id: fav.id,
          userId: fav.userId,
          songId: fav.songId,
        },
      })
    } catch (e) {
      console.log("Favorite skip:", fav.id)
    }
  }

  console.log("Favorites imported")
}

async function importPlaylists() {
  const playlists = await readCsv(
    path.join(process.cwd(), "tabele/Playlist.csv")
  )

  for (const playlist of playlists) {
    try {
      await prisma.playlist.create({
        data: {
          id: playlist.id,
          name: playlist.name,
          userId: playlist.userId,
          isAdmin: playlist.isAdmin === "true",
          category: playlist.category || null,
        },
      })
    } catch (e) {
      console.log("Playlist skip:", playlist.name)
    }
  }

  console.log("Playlists imported")
}

async function importPlaylistSongs() {
  const items = await readCsv(
    path.join(process.cwd(), "tabele/PlaylistSong.csv")
  )

  for (const item of items) {
    try {
      await prisma.playlistSong.create({
        data: {
          id: item.id,
          playlistId: item.playlistId,
          songId: item.songId,
          order: Number(item.order || 0),
        },
      })
    } catch (e) {
      console.log("PlaylistSong skip:", item.id)
    }
  }

  console.log("PlaylistSongs imported")
}

async function importListeningPlaylists() {
  const playlists = await readCsv(
    path.join(process.cwd(), "tabele/ListeningPlaylist.csv")
  )

  for (const playlist of playlists) {
    try {
      await prisma.listeningPlaylist.create({
        data: {
          id: playlist.id,
          name: playlist.name,
          userId: playlist.userId || null,
          category: playlist.category || null,
          isPublic: playlist.isPublic === "true",
          views: Number(playlist.views || 0),
        },
      })
    } catch (e) {
      console.log("ListeningPlaylist skip:", playlist.name)
    }
  }

  console.log("ListeningPlaylists imported")
}

async function importListeningItems() {
  const items = await readCsv(
    path.join(process.cwd(), "tabele/ListeningItem.csv")
  )

  for (const item of items) {
    try {
      await prisma.listeningItem.create({
        data: {
          id: item.id,
          playlistId: item.playlistId,
          title: item.title || null,
          url: item.url,
          type: item.type,
          order: Number(item.order || 0),
        },
      })
    } catch (e) {
      console.log("ListeningItem skip:", item.id)
    }
  }

  console.log("ListeningItems imported")
}

async function importListeningLikes() {
  const likes = await readCsv(
    path.join(process.cwd(), "tabele/ListeningPlaylistLike.csv")
  )

  for (const like of likes) {
    try {
      await prisma.listeningPlaylistLike.create({
        data: {
          id: like.id,
          userId: like.userId,
          playlistId: like.playlistId,
        },
      })
    } catch (e) {
      console.log("ListeningLike skip:", like.id)
    }
  }

  console.log("ListeningLikes imported")
}

async function main() {
  await importArtists()
  await importSongs()

  await importUsers()

  await importFavorites()

  await importPlaylists()
  await importPlaylistSongs()

  await importListeningPlaylists()
  await importListeningItems()
  await importListeningLikes()

  console.log("DONE")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })