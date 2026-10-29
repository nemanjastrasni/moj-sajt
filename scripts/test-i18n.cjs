require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, afterEach } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")
const i18n = require("../lib/i18n/index.ts")
const { english } = require("../lib/i18n/messages.ts")
const { getCategoryLabel } = require("../lib/categories.ts")
const { authErrorMessage } = require("../lib/auth/navigation.ts")
afterEach(() => { delete global.document; delete global.window; delete global.localStorage })
function setup(value = null, blocked = false) {
  const root = { dataset: {}, lang: "" }; const events = new EventTarget()
  const storage = { getItem() { if (blocked) throw Error("blocked"); return value }, setItem(key, next) { assert.equal(key, i18n.LOCALE_KEY); if (blocked) throw Error("blocked"); value = next } }
  global.document = { documentElement: root }; global.window = events; global.localStorage = storage
  return { root, value: () => value }
}
test("only English is opt-in, with Serbian as the safe default", () => {
  for (const value of [null, undefined, "EN", "ru", {}, "__proto__"]) assert.equal(i18n.normalizeLocale(value), "sr")
  assert.equal(i18n.normalizeLocale("en"), "en")
})
test("head initializer restores locale and document language before hydration", () => {
  const env = setup("en"); vm.runInNewContext(i18n.LOCALE_INIT_SCRIPT, { document, localStorage })
  assert.equal(env.root.dataset.language, "en"); assert.equal(env.root.lang, "en")
})
test("blocked or unset storage still produces the Serbian default", () => {
  for (const blocked of [false, true]) { const env = setup(null, blocked); vm.runInNewContext(i18n.LOCALE_INIT_SCRIPT, { document, localStorage }); assert.equal(env.root.lang, "sr-Latn") }
})
test("switch persists, broadcasts and unsubscribes independently of theme", () => {
  const env = setup(); env.root.dataset.theme = "light"; let calls = 0
  const stop = i18n.subscribeLocale(() => calls++)
  i18n.applyLocale("en"); assert.equal(env.value(), "en"); assert.equal(env.root.lang, "en"); assert.equal(calls, 1)
  assert.equal(env.root.dataset.theme, "light")
  stop(); i18n.applyLocale("sr"); assert.equal(calls, 1)
})
test("storage failure does not prevent switching in the current tab", () => {
  const env = setup(null, true); assert.doesNotThrow(() => i18n.applyLocale("en")); assert.equal(env.root.lang, "en")
})
test("cross-tab changes apply without overwriting storage; other preferences are ignored", () => {
  const env = setup("sr"); let calls = 0; const stop = i18n.subscribeLocale(() => calls++)
  const event = new Event("storage"); event.key = i18n.LOCALE_KEY; event.newValue = "en"; window.dispatchEvent(event)
  assert.equal(env.root.lang, "en"); assert.equal(env.value(), "sr"); assert.equal(calls, 1)
  const other = new Event("storage"); other.key = "gitarakordi-theme"; other.newValue = "dark"; window.dispatchEvent(other); assert.equal(calls, 1)
  const clear = new Event("storage"); clear.key = null; clear.newValue = null; window.dispatchEvent(clear); assert.equal(env.root.lang, "sr-Latn"); stop()
})
test("category labels are geographic, consistent and leave stored values unchanged", () => {
  assert.equal(getCategoryLabel("Domace"), "Zabavne")
  assert.equal(getCategoryLabel("domace", "en"), "Ex-Yu Pop & Rock")
  assert.equal(getCategoryLabel("narodne", "en"), "Ex-Yu Folk")
  assert.equal(getCategoryLabel("Strane", "en"), "International")
  for (const category of ["domace", "narodne", "strane", "mix"]) assert.equal(getCategoryLabel(category, "en"), i18n.translate("en", getCategoryLabel(category)))
})
test("unknown content and prototype keys never become translations", () => {
  for (const text of ["Zemlja", "Ekatarina Velika", "G   D\nOvo je zemlja za nas", "__proto__", "constructor"]) assert.equal(i18n.translate("en", text), text)
  assert.equal(i18n.translate("sr", "Pesme"), "Pesme"); assert.equal(i18n.translate("en", "Pesme"), "Songs")
})

test("playlist headings keep Serbian diacritics and their English translations", () => {
  for (const [source, translated] of [["Po težini", "By difficulty"], ["Liste za slušanje", "Listening playlists"], ["Plejliste za slušanje", "Listening playlists"]]) {
    assert.equal(i18n.translate("sr", source), source)
    assert.equal(i18n.translate("en", source), translated)
  }
})

test("translation dictionary never declares duplicate keys", () => {
  const file = path.join(__dirname, "../lib/i18n/messages.ts")
  const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true)
  const seen = new Set()
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(ast) !== "english" || !ts.isObjectLiteralExpression(declaration.initializer)) continue
      for (const property of declaration.initializer.properties) {
        const key = property.name.text
        assert.ok(!seen.has(key), "Duplicate translation: " + key)
        seen.add(key)
      }
    }
  }
  assert.ok(seen.size > 0)
})
test("interpolation substitutes only named values without interpreting markup", () => {
  assert.equal(i18n.translate("en", "Pronadjeno {count} pesama.", { count: 4 }), "4 songs found.")
  assert.equal(i18n.translate("en", "{count}", { count: "<script>" }), "<script>")
})
test("all authentication error codes have English interface messages", () => {
  for (const code of ["CredentialsSignin", "OAuthAccountNotLinked", "AccessDenied", "Configuration", "ServiceUnavailable", "OAuthSignin", "OAuthCallback", "OAuthCreateAccount", "SessionRequired", "unknown"]) {
    const message = authErrorMessage(code); assert.notEqual(i18n.translate("en", message), message)
  }
})
test("explicit UI text keys exist and client hooks are not called in server pages", () => {
  const root = path.join(__dirname, "..", "app")
  function walkFiles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) { walkFiles(file); continue }
      if (!file.endsWith(".tsx")) continue
      const source = fs.readFileSync(file, "utf8")
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      if (source.includes("useI18n()")) assert.ok(ast.statements.some(node => ts.isExpressionStatement(node) && node.expression.text === "use client"), "Client hook in server file: " + file)
      function visit(node) {
        if (source.includes("useI18n") && ts.isCallExpression(node) && node.expression.getText(ast) === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) assert.ok(Object.hasOwn(english, node.arguments[0].text), file + ': ' + node.arguments[0].text)
        if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "UiText") {
          const attribute = node.attributes.properties.find(item => item.name?.text === "text")
          if (attribute?.initializer && ts.isStringLiteral(attribute.initializer)) assert.ok(Object.hasOwn(english, attribute.initializer.text), file + ': ' + attribute.initializer.text)
        }
        ts.forEachChild(node, visit)
      }
      visit(ast)
    }
  }
  walkFiles(root)
})
