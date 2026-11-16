import process from "node:process"
import { randomUUID } from "node:crypto"
import type { ProcessMemorySnapshot } from "./process-memory-model"

const instanceId = randomUUID()

// Node reports memoryUsage in bytes, but resourceUsage.maxRSS in KiB.
// Explicit fields keep environment variables, paths and other process data private.
export function measureProcessMemory(): ProcessMemorySnapshot {
  const memory = process.memoryUsage()
  let peakRssBytes: number | null = null
  try {
    const peak = process.resourceUsage().maxRSS * 1024
    if (Number.isSafeInteger(peak) && peak > 0) peakRssBytes = peak
  } catch { /* Peak RSS is unavailable on some runtimes. */ }
  return {
    measuredAt: new Date().toISOString(), instanceId, uptimeSeconds: process.uptime(),
    rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal,
    externalBytes: memory.external, arrayBuffersBytes: memory.arrayBuffers, peakRssBytes,
  }
}
