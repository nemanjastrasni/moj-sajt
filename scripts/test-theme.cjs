require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, afterEach } = require("node:test")
const assert = require("node:assert/strict")
const vm = require("node:vm")
const theme = require("../lib/theme.ts")

afterEach(() => { delete global.document; delete global.window; delete global.localStorage })
function environment(saved = null, blocked = false) {
  const events = new EventTarget()
  const root = { dataset: { theme: "dark" }, style: {} }
  let value = saved
  const storage = {
    getItem(key) { assert.equal(key, theme.THEME_KEY); if (blocked) throw new Error("blocked"); return value },
    setItem(key, next) { assert.equal(key, theme.THEME_KEY); if (blocked) throw new Error("blocked"); value = next },
  }
  global.document = { documentElement: root }; global.window = events; global.localStorage = storage
  return { root, storage, value: () => value }
}

test("only explicit light is accepted, including corrupted stored preferences", () => {
  for (const value of [null, undefined, "system", "LIGHT", "", {}, "<script>"]) assert.equal(theme.normalizeTheme(value), "dark")
  assert.equal(theme.normalizeTheme("light"), "light")
})
test("pre-paint initializer restores preference and sets native control scheme", () => {
  const env = environment("light")
  vm.runInNewContext(theme.THEME_INIT_SCRIPT, { document, localStorage })
  assert.equal(env.root.dataset.theme, "light"); assert.equal(env.root.style.colorScheme, "light")
})
test("initializer defaults to dark for first visitors and storage failures", () => {
  for (const blocked of [false, true]) {
    const env = environment(null, blocked)
    vm.runInNewContext(theme.THEME_INIT_SCRIPT, { document, localStorage })
    assert.equal(env.root.dataset.theme, "dark"); assert.equal(env.root.style.colorScheme, "dark")
  }
})
test("toggle persists theme, updates document and notifies subscribers", () => {
  const env = environment(); let calls = 0
  const unsubscribe = theme.subscribeTheme(() => calls++)
  theme.applyTheme("light")
  assert.equal(theme.currentTheme(), "light"); assert.equal(env.value(), "light"); assert.equal(calls, 1)
  theme.applyTheme("dark"); assert.equal(env.value(), "dark"); assert.equal(calls, 2)
  unsubscribe(); theme.applyTheme("light"); assert.equal(calls, 2)
})
test("blocked persistence does not disable the working switch", () => {
  const env = environment(null, true)
  assert.doesNotThrow(() => theme.applyTheme("light")); assert.equal(env.root.dataset.theme, "light")
})
test("another-tab preference changes apply without writing back or looping", () => {
  const env = environment("dark"); let calls = 0
  const unsubscribe = theme.subscribeTheme(() => calls++)
  const event = new Event("storage"); event.key = theme.THEME_KEY; event.newValue = "light"
  window.dispatchEvent(event)
  assert.equal(theme.currentTheme(), "light"); assert.equal(env.value(), "dark"); assert.equal(calls, 1)
  const unrelated = new Event("storage"); unrelated.key = "other-key"; unrelated.newValue = "dark"
  window.dispatchEvent(unrelated); assert.equal(calls, 1)
  const clear = new Event("storage"); clear.key = null; clear.newValue = null
  window.dispatchEvent(clear); assert.equal(theme.currentTheme(), "dark")
  unsubscribe()
})
