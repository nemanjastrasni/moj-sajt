// Compatibility entry point: defaults to a read-only audit, never a blind import.
const { main } = require("./artist-wiki.cjs")
if (require.main === module) main().catch(error => {
  console.error("Wikipedia maintenance stopped:", error.code || error.name, "/ see docs/artist-wiki.md")
  process.exitCode = 1
})
module.exports = { main }
