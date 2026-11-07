/* eslint-disable @typescript-eslint/no-require-imports -- Standalone public-page performance audit. */
const { parseArgs } = require('node:util')
const fs = require('node:fs/promises'), path = require('node:path'), puppeteer = require('puppeteer')
const { values } = parseArgs({ options: { 'base-url': { type: 'string', default: 'https://moj-sajt-rho.vercel.app' }, song: { type: 'string', default: '/pesme/domace/zana/dodirni-mi-kolena' }, out: { type: 'string', default: 'reports/site-performance' }, 'home-only': { type: 'boolean', default: false } } })
const base = new URL(values['base-url'])
if (!['http:', 'https:'].includes(base.protocol) || base.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(base.hostname) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw Error('Use a public HTTPS origin, or a local development server, without credentials, path or query.')
const song = new URL(values.song, base)
if (song.origin !== base.origin || song.search || song.hash || !song.pathname.startsWith('/pesme/')) throw Error('Use a public song path without personal playlist/favorite context.')
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function main() {
  const out = path.resolve(values.out), stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await fs.mkdir(out, { recursive: true })
  const browser = await puppeteer.launch({ headless: true, pipe: true, args: ['--no-sandbox', '--disable-gpu'] })
  const runs = []
  try {
    for (const profile of ['desktop', 'mobile']) for (const [name, url] of (values['home-only'] ? [['home', base.href]] : [['home', base.href], ['song', song.href]])) {
      const context = await browser.createBrowserContext(), page = await context.newPage(), cdp = await page.createCDPSession()
      const requests = new Map(), completed = [], failures = [], scriptErrors = [], blockedWrites = []
      page.on('pageerror', error => scriptErrors.push(error.message))
      await page.setRequestInterception(true)
      page.on('request', request => {
        if (!['GET', 'HEAD'].includes(request.method())) {
          blockedWrites.push(new URL(request.url()).pathname)
          return request.abort()
        }
        return request.continue()
      })
      await page.setViewport(profile === 'mobile' ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { width: 1366, height: 900, deviceScaleFactor: 1 })
      await cdp.send('Network.enable'); await page.setCacheEnabled(false)
      if (profile === 'mobile') {
        // Keep throttling/cache state in Puppeteer's API and use CDP for observation.
        await page.emulateNetworkConditions({ latency: 150, download: 1600000 / 8, upload: 750000 / 8 })
        await page.emulateCPUThrottling(4)
      }
      cdp.on('Network.requestWillBeSent', event => requests.set(event.requestId, { url: event.request.url, type: event.type, method: event.request.method }))
      cdp.on('Network.loadingFinished', event => { const request = requests.get(event.requestId); if (request) completed.push({ ...request, bytes: event.encodedDataLength }) })
      cdp.on('Network.loadingFailed', event => { const request = requests.get(event.requestId); if (request && ['GET', 'HEAD'].includes(request.method) && !event.canceled) failures.push({ ...request, error: event.errorText }) })
      await page.evaluateOnNewDocument(() => {
        window.__pageAudit = { lcp: [], cls: 0, longTasks: 0 }
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__pageAudit.lcp.push({ ms: entry.startTime, url: entry.url || '', size: entry.size }) }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__pageAudit.cls += entry.value }).observe({ type: 'layout-shift', buffered: true })
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__pageAudit.longTasks += Math.max(0, entry.duration - 50) }).observe({ type: 'longtask', buffered: true })
      })
      console.log(`Measuring ${profile} ${name}`)
      let response, navigationError = ''
      try { response = await page.goto(url, { waitUntil: 'load', timeout: 120000 }) }
      catch (error) { navigationError = error.name }
      await pause(1000)
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0], paints = performance.getEntriesByType('paint')
        return { title: document.title, canonical: document.querySelector('link[rel="canonical"]')?.href || null, robots: document.querySelector('meta[name="robots"]')?.content || null, description: document.querySelector('meta[name="description"]')?.content || null,
          h1Count: document.querySelectorAll('h1').length, ttfbMs: nav?.responseStart, dnsMs: nav ? nav.domainLookupEnd - nav.domainLookupStart : null,
          connectMs: nav ? nav.connectEnd - nav.connectStart : null, requestWaitMs: nav ? nav.responseStart - nav.requestStart : null,
          responseEndMs: nav?.responseEnd, domReadyMs: nav?.domContentLoadedEventEnd, loadMs: nav?.loadEventEnd, fcpMs: paints.find(paint => paint.name === 'first-contentful-paint')?.startTime,
          ...window.__pageAudit, viewport: { width: innerWidth, height: innerHeight }, overflow: document.documentElement.scrollWidth > innerWidth,
          images: [...document.images].filter(image => image.currentSrc).map(image => ({ src: image.currentSrc, loaded: image.complete && image.naturalWidth > 0, width: image.naturalWidth, height: image.naturalHeight })) }
      })
      const run = { profile, page: name, url, status: response?.status(), navigationError, metrics, transferBytes: completed.reduce((sum, request) => sum + request.bytes, 0), imageBytes: completed.filter(request => request.type === 'Image').reduce((sum, request) => sum + request.bytes, 0), requests: completed.length, largestResources: completed.sort((a, b) => b.bytes - a.bytes).slice(0, 12), failures, scriptErrors, blockedWrites }
      runs.push(run)
      await page.screenshot({ path: path.join(out, `${stamp}-${profile}-${name}.png`), fullPage: true })
      console.log(JSON.stringify({ profile, page: name, status: run.status, ttfbMs: metrics.ttfbMs, lcpMs: metrics.lcp.at(-1)?.ms, cls: metrics.cls, imageBytes: run.imageBytes, transferBytes: run.transferBytes, navigationError }))
      await fs.writeFile(path.join(out, `${stamp}.json`), JSON.stringify({ note: 'Cold-cache synthetic browser measurements, not Lighthouse scores, field Core Web Vitals or measured INP. Mobile: 1.6 Mbps / 150 ms / 4x CPU. No login or private playlist URLs. Only GET/HEAD allowed; presence writes are blocked. TTFB/LCP include local DNS and connection time; inspect dnsMs before attributing delay to the server.', runs }, null, 2))
      await context.close()
    }
  } finally { await browser.close() }
  console.log(path.join(out, `${stamp}.json`))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
