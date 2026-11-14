/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test"), assert = require("node:assert/strict")
const { setupHomeIndexes, definitions } = require("./setup-home-indexes.cjs")
function fixture() {
  const rows = [], statements = []
  return { rows, statements, db: { async query(sql) {
    statements.push(sql)
    if (sql.startsWith("SELECT i.relname")) return { rows: rows.slice() }
    if (sql.startsWith("CREATE INDEX")) { const def = definitions.find(def => sql.includes('"' + def.name + '"')); rows.push({ ...def, valid: true, ready: true, method: "btree", keys: 2, partial: false, expression: false }) }
    return { rows: [] }
  } } }
}
test("home index audit is read-only and creation is opt-in, concurrent and idempotent", async () => {
  const f = fixture()
  assert.equal((await setupHomeIndexes(f.db)).missing.length, 2)
  assert.ok(f.statements.every(sql => sql.startsWith("SELECT")))
  assert.equal((await setupHomeIndexes(f.db, { apply: true })).created.length, 2)
  assert.equal((await setupHomeIndexes(f.db, { apply: true })).created.length, 0)
  assert.ok(f.statements.filter(sql => sql.startsWith("CREATE")).every(sql => sql.includes("CONCURRENTLY")))
  assert.ok(!f.statements.some(sql => /DROP|DELETE|UPDATE|ALTER TABLE|^BEGIN/.test(sql)))
})
test("equivalent existing indexes are retained; invalid indexes and wrong NULL ordering stop setup", async () => {
  for (const change of [row => row.valid = false, row => row.secondOrder = 1]) {
    const f = fixture(); await setupHomeIndexes(f.db, { apply: true }); change(f.rows[0])
    await assert.rejects(setupHomeIndexes(f.db, { apply: true }), /requires inspection/)
  }
  const f = fixture(); await setupHomeIndexes(f.db, { apply: true }); f.rows.forEach((row, i) => row.name = "existing_" + i)
  assert.equal((await setupHomeIndexes(f.db, { apply: true })).created.length, 0)
})
