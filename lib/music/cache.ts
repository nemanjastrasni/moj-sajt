const musicCache = new Map<string, any>()

export function getFromCache(key: string) {
  return musicCache.get(key)
}

export function setToCache(key: string, value: any) {
  musicCache.set(key, value)
}