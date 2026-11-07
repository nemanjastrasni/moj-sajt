// Display-only values: importing a badge must not initialize the chord parser.
export const difficultyLevels = ["very_easy", "easy", "medium", "hard", "very_hard"] as const
export type Difficulty = typeof difficultyLevels[number]
export const difficultyLabels: Record<Difficulty, string> = {
  very_easy: "Veoma lako", easy: "Lako", medium: "Srednje", hard: "Te\u0161ko", very_hard: "Veoma te\u0161ko",
}
export const difficultyExplanation = "Automatska procena prema akordima; ritam, tempo i solo nisu ocenjeni."
