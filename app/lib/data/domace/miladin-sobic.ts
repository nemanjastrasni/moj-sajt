import { createSongId, slugify } from "../../until/slug";

export const miladinSobicSongs = [
  {
    id: createSongId("Miladin Šobić","Četa luđaka"),
    title: "Četa luđaka",
    artist: slugify("Miladin Šobić"),
    artistFull: "Miladin Šobić",
    category: "domace",
    content: `
Intro:
(par puta)
I-----------------------1--------1h01---------------I
I-------333-------------3-------2----2---------1----I
I-2p5p2----2------------2------3------3-------0-----I
I-----------------------------0--------0-----2------I
I-----------------------------------------333-------I
I---------------------------------------------------I

Strofa I:
Dm                       C            Dm     C           Dm   Fm     C
Tutnji zivot pored mene ne gleda cetu ludjaka
Dm                           C      G          Dm            C         Dm        Fm         C
Ruse se snovi trose se zene filmovi tudji a moja traka traka
Dm                                C            Dm         C            Dm          Fm         C
Uvijek drugi mirni u zbrci uvijek drugi sa srecom svjezom
Dm                          C                   Dm             C            Dm           Fm                C
A ja nevican prljavoj trci smijem se cestit nad praznom mrezom

Refren:
C              Dm            Fm             C             Dm          C        Dm      C      Dm
A ja imam sebe u sebi postenog druga
Dm        C             G             Dm
I volim sto su tako ciste moja sreca moja tuga
`
  },
   {
    id: createSongId("Miladin Šobić","Ašik Ajša"),
    title: "Ašik Ajša",
    artist: slugify("Miladin Šobić"),
    artistFull: "Miladin Šobić",
    category: "domace",
    content: `

Ašik Ajša

Am
Ni sad neznam kako je dovedoh
Am          G         Am
one noci do studenske sobe
Am            G             F
ni sad neznam kako kraj nje legoh
      E                  Am
bjese ljeto na njoj malo robe

Am             G         Am
Sva pokisla od ljetnjega pljuska
Am          G         Am
niz lice se kotrljale kapi
Am           G        F
tanka suknja kukovima uska
E                       Am
gladna kuja za kurjakom vapi

B            C      Dm     D7 Dm
A nije znala da sam pjesnik
B         C         Dm
i da moze u stihove moje
F                     C
Asik Ajsa u najboljem dobu
E                         Am
udje u njih bas kroz moju sobu

... (možeš nastaviti ostatak teksta)
`
  }


]