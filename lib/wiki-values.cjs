/** @param {unknown} value */
function stableStringify(value) {
  return JSON.stringify(value ?? null, (_key, node) => {
    if (node && typeof node === "object" && !Array.isArray(node)) return Object.fromEntries(Object.keys(node).sort().map(key => [key, node[key]]))
    return node
  })
}
module.exports = { stableStringify }
