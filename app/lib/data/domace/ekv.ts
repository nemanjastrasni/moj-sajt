import { createSongId, slugify } from "../../until/slug";

export const ekvSongs = [
  {
    id: createSongId("EKV","7-dana"),
    title: "7 dana",
    artist: slugify("EKV"),
    artistFull: "EKV",
    category: "domace",
    content: `
Gm                 Eb               Cm      Eb
I sedam dana sam i gore i dole, potrazi me
I sedam dana sam, nadji i stavi, pokazi me

Nek boli dok boli, rukama stegni kozu svoju
Poda mnom zategni strah, noktima pucaj u znoju

Jos ovaj put dok trazi i zove zaklonicu
Jos ovaj put dok zraci i moli poklonicu

Drzi mene, voli mene
Uzmi moj sakom vlazni grli vrat
I sacuvaj vreme i seme za mene
Bio bih tvoj brat, ti si moj brat

D           C
Slomi se, o skloni se
Slomi se, o skloni se

   B     A     Ab
Od mene
   Gm    Fm    Em    Fm
Od mene       od mene`,
  },
   {
    id: createSongId("EKV","Krug"),
    title: "Krug",
    artist: slugify("EKV"),
    artistFull: "EKV",
    category: "domace",
    content: `
    
    
    Am                       F
Ovaj krug sam smislio,
           C                   G
Ovaj krug sam stvorio.
Am                    F
Ovaj krug sam razbio,
     C           G
U vetar rasuo.

Am                       F
Vetar misli, vetar zna
           C                   G
Sve sto znamo ti i ja.
Am                    F
On me voli, on me nosi,
     C           G
On me razbija,

 Am    E
A-haaa


       G         F
I kao ne, i kao da,

       G              F
I kao zabrana, i kao dozvola,

     G                 F
Kao ne, ne, ne, i kao da, da, da,

     G            D
Kao zabava i kao dosada.
`,
  }
]
