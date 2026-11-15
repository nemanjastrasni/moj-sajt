// Standard tuning; frets run from string 6 (low E) to string 1 (high E).
// -1 means omit the string. These are examples, not the only possible shapes.
export const basicGuitarChords = [
  { name: "Em", root: "E", frets: [0, 2, 2, 0, 0, 0] },
  { name: "Am", root: "A", frets: [-1, 0, 2, 2, 1, 0] },
  { name: "C", root: "C", frets: [-1, 3, 2, 0, 1, 0] },
  { name: "G", root: "G", frets: [3, 2, 0, 0, 0, 3] },
  { name: "D", root: "D", frets: [-1, -1, 0, 2, 3, 2] },
  { name: "Dm", root: "D", frets: [-1, -1, 0, 2, 3, 1] },
  { name: "E", root: "E", frets: [0, 2, 2, 1, 0, 0] },
  { name: "A", root: "A", frets: [-1, 0, 2, 2, 2, 0] },
] as const
