import type { CapoSource, CapoOption } from "./capoDisplay"
import type { SheetLine } from "./songSheet"
export type CapoScope = { id: string; lines: SheetLine[]; transpose: number; source: CapoSource }
export type RecommendationView = { scope: CapoScope | null; phase: "idle" | "loading" | "ready" | "error"; options: CapoOption[] }
export const sameCapoScope = (left: CapoScope | null, right: CapoScope) => Boolean(left && left.id === right.id && left.lines === right.lines && left.transpose === right.transpose)
const afterPaint = () => typeof requestAnimationFrame === "function" ? new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0))) : Promise.resolve()
export function createCapoRecommendations(notify: (view: RecommendationView) => void, load = () => import("./capo"), yieldForPaint = afterPaint) {
  let sequence = 0, active: { scope: CapoScope; promise: Promise<CapoOption[]> | null } | null = null
  return {
    get scope() { return active?.scope ?? null },
    read(scope: CapoScope): Promise<CapoOption[]> {
      if (active && sameCapoScope(active.scope, scope) && active.promise) return active.promise
      const token = ++sequence, request = { scope, promise: null as Promise<CapoOption[]> | null }; active = request
      notify({ scope, phase: "loading", options: [] })
      request.promise = Promise.resolve().then(load).then(async engine => {
        await yieldForPaint()
        if (token !== sequence) return []
        const options = engine.rankCapos(scope.lines, scope.transpose, scope.source)
        if (token === sequence) notify({ scope, phase: "ready", options })
        return token === sequence ? options : []
      }).catch(() => { if (token === sequence) { request.promise = null; notify({ scope, phase: "error", options: [] }) }; return [] })
      return request.promise
    },
    release(notifyChange = true) { sequence++; active = null; if (notifyChange) notify({ scope: null, phase: "idle", options: [] }) },
  }
}
