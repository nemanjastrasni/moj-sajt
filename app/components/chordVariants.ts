type ChordVariant = {
  name: string
  image: string
}

export const chordVariants: Record<
  string,
  ChordVariant[]
> = {
  Am: [
  {
    name: "Open",
    image: "/chords_final/Am_v1.png",
  },
    {
      name: "Barre",
      image: "/chords_final/Am_barre.png",
    },
    {
      name: "Easy",
      image: "/chords_final/Am_easy.png",
    },
  ],

 C: [
  {
    name: "Open",
    image: "/chords_final/Cmaj_v1.png",
  },
  {
    name: "Barre",
    image: "/chords_final/C_barre.png",
  },
],

G: [
  {
    name: "Open",
    image: "/chords_final/Gmaj_v1.png",
  },
  {
    name: "Easy",
    image: "/chords_final/G_easy.png",
  },
  ],
}