export type ProcessMemorySnapshot = {
  measuredAt: string
  instanceId: string
  uptimeSeconds: number
  rssBytes: number
  heapUsedBytes: number
  heapTotalBytes: number
  externalBytes: number
  arrayBuffersBytes: number
  peakRssBytes: number | null
}

export function isProcessMemorySnapshot(value: unknown): value is ProcessMemorySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  const bytes = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0
  return typeof item.measuredAt === "string" && item.measuredAt.length <= 30 && Number.isFinite(Date.parse(item.measuredAt)) &&
    typeof item.instanceId === "string" && /^[a-f0-9-]{36}$/.test(item.instanceId) &&
    typeof item.uptimeSeconds === "number" && Number.isFinite(item.uptimeSeconds) && item.uptimeSeconds >= 0 &&
    [item.rssBytes, item.heapUsedBytes, item.heapTotalBytes, item.externalBytes, item.arrayBuffersBytes].every(bytes) &&
    (item.heapUsedBytes as number) <= (item.heapTotalBytes as number) &&
    (item.peakRssBytes === null || bytes(item.peakRssBytes))
}

export const memoryMiB = (bytes: number) => `${new Intl.NumberFormat("sr-Latn", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MiB`
export function processDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
