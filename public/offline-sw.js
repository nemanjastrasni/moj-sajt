/* Public application shell only. Authenticated HTML, APIs and playlist data are never cached here. */
const PREFIX = 'gitarakordi-offline-shell-v1-', POINTER = 'gitarakordi-offline-pointer-v1'
let preparing
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
async function currentCache() {
  const pointer = await (await caches.open(POINTER)).match('/offline-shell-pointer')
  return pointer ? caches.open(await pointer.text()) : null
}
async function prepare() {
  const response = await fetch('/offline', { credentials: 'omit', cache: 'no-store' })
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw Error('shell unavailable')
  const html = await response.clone().text(), assets = new Set()
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), self.location.origin)
    if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) assets.add(url.href)
  }
  if (!assets.size || assets.size > 100) throw Error('invalid shell')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode([...assets].sort().join('\n')))
  const key = PREFIX + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''), cache = await caches.open(key)
  let bytes = new TextEncoder().encode(html).length
  async function store(url) {
    const result = await fetch(url, { credentials: 'omit', cache: 'reload' })
    if (!result.ok) throw Error('asset unavailable')
    const blob = await result.clone().blob(); bytes += blob.size
    if (bytes > 20 * 1024 * 1024) throw Error('shell too large')
    if (new URL(url).pathname.endsWith('.css')) {
      const css = await result.clone().text()
      for (const match of css.matchAll(/url\(["']?([^\s)"']+)/g)) {
        const asset = new URL(match[1], url)
        if (asset.origin === self.location.origin && asset.pathname.startsWith('/_next/static/')) assets.add(asset.href)
      }
    }
    await cache.put(url, result)
  }
  // A Set iterator includes font URLs discovered while storing the CSS.
  for (const asset of assets) { if (assets.size > 120) throw Error('too many assets'); await store(asset) }
  await cache.put('/offline', response)
  await (await caches.open(POINTER)).put('/offline-shell-pointer', new Response(key))
  for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== key) await caches.delete(name)
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'PREPARE_OFFLINE' || !event.ports[0]) return
  preparing ||= prepare().finally(() => { preparing = null })
  event.waitUntil(preparing.then(() => event.ports[0].postMessage({ ok: true }), () => event.ports[0].postMessage({ ok: false })))
})
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => (await currentCache())?.match(request).then(hit => hit || fetch(request)) || fetch(request))())
  } else if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await currentCache()
      if (url.pathname === '/offline' && cache) return await cache.match('/offline') || fetch(request)
      try { return await fetch(request) } catch {
        if (!cache) return new Response('Internet veza nije dostupna.', { status: 503 })
        return Response.redirect(new URL('/offline', self.location.origin).href, 302)
      }
    })())
  }
})
