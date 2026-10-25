/* eslint-disable @typescript-eslint/no-require-imports -- Read-only Node diagnostic. */
require("@next/env").loadEnvConfig(process.cwd())
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { databaseClient } = require("./lib/artist-image-source.cjs")
const { estimateDifficulty } = require("../lib/music/difficulty.ts")

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== "--ca") throw Error("Usage: node scripts/audit-song-difficulty.cjs --ca path/to/certificate.crt")
  const client = await databaseClient(args[1])
  try {
    await client.query("BEGIN READ ONLY")
    const { rows } = await client.query('SELECT lyrics, chords, difficulty FROM public."Song"')
    const estimates = {}, started = Date.now()
    for (const row of rows) {
      const level = estimateDifficulty(row).level || "unassessed"
      estimates[level] = (estimates[level] || 0) + 1
    }
    await client.query("ROLLBACK")
    console.log(JSON.stringify({ total: rows.length, legacyBeginner: rows.filter(row => row.difficulty === "beginner").length, estimates, elapsedMs: Date.now() - started }, null, 2))
  } finally { await client.end() }
}
main().catch(() => { console.error("Read-only difficulty audit failed. Check the CA path, connection and database configuration."); process.exitCode = 1 })
