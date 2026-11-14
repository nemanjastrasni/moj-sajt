/* eslint-disable @typescript-eslint/no-require-imports -- Read-only public catalog preparation and offline build verification. */
const fs = require("node:fs/promises"), path = require("node:path"), { createHash } = require("node:crypto"), { parseArgs } = require("node:util")
const ROOT = path.resolve(__dirname, "..")
const FILE = "lib/playlists/catalog-assessments.json"
const INPUTS = ["lib/music/difficulty.ts", "lib/music/difficultyModel.ts", "lib/chords/songSheet.ts", "lib/chords/chordSymbols.ts", "lib/playlists/catalog.ts", "lib/playlists/catalog-source.ts"]

async function algorithmHash(root = ROOT) {
  const hash = createHash("sha256")
  for (const file of INPUTS) hash.update(file + "\n" + (await fs.readFile(path.join(root, file), "utf8")).replace(/\r\n?/g, "\n") + "\n")
  const lock = JSON.parse(await fs.readFile(path.join(root, "package-lock.json"), "utf8"))
  hash.update(JSON.stringify(lock.packages["node_modules/chord-symbol"]))
  return hash.digest("hex")
}

async function checkSnapshot(root = ROOT) {
  const snapshot = JSON.parse(await fs.readFile(path.join(root, FILE), "utf8"))
  if (snapshot.format !== 1 || snapshot.algorithmHash !== await algorithmHash(root)) throw Error("Catalog parser changed. Regenerate the public assessment snapshot before building.")
  if (!snapshot.songs || typeof snapshot.songs !== "object" || Array.isArray(snapshot.songs)) throw Error("Invalid catalog assessment snapshot")
  for (const [id, row] of Object.entries(snapshot.songs)) {
    if (!id || !Array.isArray(row) || row.length !== 3 || !/^[a-f0-9]{64}$/.test(row[0]) || ![null, "very_easy", "easy", "medium", "hard", "very_hard"].includes(row[1]) || !Array.isArray(row[2]) || row[2].some(chord => typeof chord !== "string")) throw Error("Invalid public assessment: " + id)
  }
  return { valid: true, songs: Object.keys(snapshot.songs).length }
}

async function generateSnapshot(db) {
  require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
  const { estimateDifficulty } = require("../lib/music/difficulty.ts"), { catalogSourceHash } = require("../lib/playlists/catalog-source.ts")
  let rows
  await db.query("BEGIN READ ONLY")
  try {
    await db.query("SET LOCAL statement_timeout='15s'")
    rows = (await db.query(`SELECT s.id,s.lyrics,s.chords,${catalogSourceHash.text} AS "sourceHash" FROM public."Song" s WHERE s.category IN ('domace','narodne','strane') ORDER BY s.id`, catalogSourceHash.values)).rows
  } finally { await db.query("ROLLBACK") }
  const songs = Object.create(null)
  for (const row of rows) { const assessment = estimateDifficulty(row); songs[row.id] = [row.sourceHash, assessment.level, assessment.chords] }
  return { format: 1, algorithmHash: await algorithmHash(), songs }
}

async function main() {
  const { values } = parseArgs({ options: { check: { type: "boolean", default: false }, output: { type: "string" }, ca: { type: "string" } } })
  if (values.check || !values.output) { console.log(JSON.stringify(await checkSnapshot())); return }
  require("@next/env").loadEnvConfig(ROOT, false, { info() {}, error() {} })
  const db = await require("./lib/artist-image-source.cjs").databaseClient(values.ca)
  let snapshot
  try { snapshot = await generateSnapshot(db) } finally { await db.end() }
  const output = path.resolve(values.output)
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output + ".tmp", JSON.stringify(snapshot) + "\n")
  await fs.rename(output + ".tmp", output)
  console.log(JSON.stringify({ readOnly: true, output, songs: Object.keys(snapshot.songs).length, containsLyricsOrAccounts: false }))
}
module.exports = { algorithmHash, checkSnapshot, generateSnapshot, INPUTS }
if (require.main === module) main().catch(error => { console.error("Catalog snapshot stopped:", error.code || error.message); process.exitCode = 1 })
