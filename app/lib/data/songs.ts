

export type Song = {
  id: string
  title: string
  artist: string
  artistFull: string
  category: string
  content: string
}

import { ekvSongs } from "./domace/ekv"
import { miladinSobicSongs } from "./domace/miladin-sobic"
import { acoPejovicSongs } from "./narodne/aco-pejovic"
import {atomskoSklonisteSongs}from"./domace/atomsko-skloniste"






export const songs: Song[] = [
  ...ekvSongs,
  ...miladinSobicSongs,
  ...acoPejovicSongs,
  ...atomskoSklonisteSongs,






]



