require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const Module = require("node:module")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const cheerio = require("cheerio")
let session = null, pathname = "/kontakt"
const original = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "next-auth/react") return { useSession: () => ({ data: session, status: session ? "authenticated" : "unauthenticated" }), signOut: () => {} }
  if (request === "next/navigation") return { usePathname: () => pathname, useRouter: () => ({ push: () => {} }) }
  if (request === "next/link") return { __esModule: true, default: props => { const dom = { ...props }; delete dom.prefetch; return React.createElement("a", dom) } }
  if (request === "next/image") return { __esModule: true, default: props => { const dom = { ...props }; delete dom.unoptimized; return React.createElement("img", dom) } }
  if (request === "./TunerButton" || request === "./MetronomeButton") return { __esModule: true, default: () => React.createElement("button", { "data-audio-tool": request }, request) }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, isMain)
}
let Menu, BackButton, HeaderSearch
try {
  Menu = require("../app/components/Menu.tsx").default
  BackButton = require("../app/components/BackButton.tsx").default
  HeaderSearch = require("../app/components/HeaderSearch.tsx").default
} finally { Module._load = original }

const render = component => cheerio.load(renderToStaticMarkup(component))

test("mobile navigation stays collapsed while search has moved to the shared permanent strip", () => {
  session = null; pathname = "/kontakt"
  const $ = render(React.createElement(Menu))
  const buttons = $(".mobile-header-buttons button")
  assert.equal(buttons.length, 1)
  assert.equal(buttons.last().attr("aria-expanded"), "false")
  assert.equal(buttons.last().attr("aria-label"), "Otvori meni")
  assert.equal($(".header-panel").attr("id"), buttons.last().attr("aria-controls"))
  assert.equal($(".header-panel").attr("data-open"), "false")
  assert.equal($(".mobile-header-brand").attr("href"), "/")
})

test("anonymous, user and admin menus retain role-aware links and all three song categories", () => {
  for (const role of [null, "user", "admin"]) {
    session = role ? { user: { id: "fixture", role, name: "Fixture", email: "fixture@example.com" } } : null
    const $ = render(React.createElement(Menu))
    assert.equal($(".mobile-menu-content a[href='/admin']").length, role === "admin" ? 1 : 0)
    assert.equal($(".desktop-guitar-nav a[href='/admin']").length, role === "admin" ? 1 : 0)
    assert.equal($(".mobile-account a[href='/profile/plejliste']").length, role ? 1 : 0)
    assert.equal($(".mobile-account a[href='/favorite']").length, role ? 1 : 0)
    if (!role) assert.equal($(".mobile-account button").text(), "Prijavi se")
    assert.deepEqual($(".mobile-menu-categories a").toArray().map(node => $(node).attr("href")), ["/pesme/narodne", "/pesme/domace", "/pesme/strane"])
  }
})

test("only one shared audio/settings control set is mounted for desktop and mobile", () => {
  const $ = render(React.createElement(Menu))
  assert.equal($("[data-audio-tool='./TunerButton']").length, 1)
  assert.equal($("[data-audio-tool='./MetronomeButton']").length, 1)
  assert.equal($("[data-theme-toggle]").length, 1)
  assert.equal($(".language-select select").length, 1)
})

test("compact Back retains the logical parent and an accessible label, and is absent on home", () => {
  pathname = "/akordi/a"
  const $ = render(React.createElement(BackButton, { compact: true }))
  assert.equal($("a").attr("href"), "/akordi")
  assert.equal($("a").attr("aria-label"), "Nazad")
  assert.equal($("a span.sr-only").text(), "Nazad")
  pathname = "/"
  assert.equal(renderToStaticMarkup(React.createElement(BackButton, { compact: true })), "")
})

test("permanent search strip is server-renderable, labeled and closed until a query is typed", () => {
  const $ = render(React.createElement(HeaderSearch))
  assert.equal($("[data-header-search] input[role=combobox]").length, 1)
  assert.equal($("input").attr("aria-expanded"), "false")
  assert.equal($("label").attr("for"), $("input").attr("id"))
  assert.equal($("dialog").length, 0)
})

test("mobile account text is escaped, not injected as markup", () => {
  pathname = "/kontakt"
  session = { user: { id: "fixture", role: "user", name: "<script>unsafe()</script>", email: "<b>mail</b>" } }
  const $ = render(React.createElement(Menu))
  assert.equal($(".mobile-account script, .mobile-account b").length, 0)
  assert.equal($(".mobile-account-name").text(), session.user.name)
  assert.equal($(".mobile-account-email").text(), session.user.email)
})
