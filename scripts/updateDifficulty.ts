// Compatibility entry point: the old default difficulty field is no longer rewritten.
import { spawnSync } from "node:child_process"
import path from "node:path"
const result = spawnSync(process.execPath, [path.join(__dirname, "song-assessments.cjs"), ...process.argv.slice(2)], { stdio: "inherit" })
process.exitCode = result.status ?? 1
