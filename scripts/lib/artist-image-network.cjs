const https = require("node:https")
const dns = require("node:dns/promises")
const { BlockList, isIP } = require("node:net")

const blocked = new BlockList()
for (const [address, prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.88.99.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",3]]) blocked.addSubnet(address, prefix)
const globalV6 = new BlockList()
globalV6.addSubnet("2000::", 3, "ipv6")
const reservedV6 = new BlockList()
for (const [address, prefix] of [["2001::",32],["2001:db8::",32],["2002::",16]]) reservedV6.addSubnet(address, prefix, "ipv6")

function isPublicAddress(address) {
  if (isIP(address) === 4) return !blocked.check(address)
  if (isIP(address) !== 6) return false
  return globalV6.check(address, "ipv6") && !reservedV6.check(address, "ipv6")
}
function imageRequestUrl(value) {
  const url = new URL(value)
  if (url.protocol !== "https:" || url.username || url.password || url.port || isIP(url.hostname) || url.hostname.startsWith("[")) throw new Error("Image must use public HTTPS without credentials or a custom port")
  return url
}

async function fetchPublicImage(value, { maxBytes = 12000000, lookup = dns.lookup, get = https.get } = {}) {
  let url = imageRequestUrl(value)
  for (let hop = 0; hop < 4; hop++) {
    const addresses = await lookup(url.hostname, { all: true })
    if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new Error("Image hostname resolves to a non-public address")
    // Pin the checked DNS addresses to the TLS request to prevent DNS rebinding.
    const response = await new Promise((resolve, reject) => {
      const request = get(url, {
        rejectUnauthorized: true,
        headers: { "User-Agent": "GitaraAkordiImageAudit/1.0 (https://gitarakordi.com)", Accept: "image/*", "Accept-Encoding": "identity" },
        lookup: (_host, options, callback) => options.all ? callback(null, addresses) : callback(null, addresses[0].address, addresses[0].family),
      }, resolve)
      request.setTimeout(15000, () => request.destroy(new Error("Image request timed out")))
      request.on("error", reject)
    })
    if ([301,302,303,307,308].includes(response.statusCode)) {
      response.destroy(); url = imageRequestUrl(new URL(response.headers.location, url).href); continue
    }
    if (response.statusCode !== 200) { response.destroy(); const error = new Error("Image request failed"); error.status = response.statusCode; throw error }
    const contentType = String(response.headers["content-type"] || "")
    if (!contentType.startsWith("image/")) { response.destroy(); throw new Error("Response is not an image") }
    if (Number(response.headers["content-length"]) > maxBytes) { response.destroy(); throw new Error("Image exceeds size limit") }
    const chunks = []; let size = 0
    for await (const chunk of response) {
      size += chunk.length
      if (size > maxBytes) { response.destroy(); throw new Error("Image exceeds size limit") }
      chunks.push(chunk)
    }
    return { data: Buffer.concat(chunks), contentType, url: url.href }
  }
  throw new Error("Too many image redirects")
}
module.exports = { isPublicAddress, imageRequestUrl, fetchPublicImage }
