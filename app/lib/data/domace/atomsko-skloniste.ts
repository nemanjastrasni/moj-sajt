import { createSongId, slugify } from "../../until/slug";

export const atomskoSklonisteSongs = [
  {
    id: createSongId("Atomsko Sklonište","Ne Cvikaj Generacijo"),
    title: "Ne Cvikaj Generacijo",
    artist: slugify("Atomsko Sklonište"),
    artistFull: "Atomsko Sklonište",
    category: "domace",
    content: `
Am             F
Nebo je olovno vetar krešti
             G         Am     E7  
neki su već pobegli u gudure
       Am          F
ti ne beži stani stani
      G          D
sedi jedi sedi jedi


ref:
E
Što te panika hvata 
H          A  
neće biti neće biti
E
trećeg svetskog rata


ref:
E             G            D         A      
Nećemo valjda biti mi ta nesretna generacija
E                  G      D               A 
nad kojom će se izvršiti velika poslednja racija


`
}
  ]