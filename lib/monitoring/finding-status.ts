import type { ReviewedFinding } from "./catalog-review"
export type FindingDecision = string | { operation: string; currentVersion?: string | null }
export function decisionMatches(item: ReviewedFinding, decision?: FindingDecision) {
  if (!decision || item.state === "unavailable" || item.state === "removed") return false
  const version = typeof decision === "string" ? null : decision.currentVersion
  return version ? version === item.currentVersion : item.state === "unchanged"
}
export function findingStatus(item: ReviewedFinding, decision?: FindingDecision): "open" | "resolved" | "dismissed" | "removed" {
  if (item.state === "removed") return "removed"
  if (decisionMatches(item, decision)) {
    const operation = typeof decision === "string" ? decision : decision!.operation
    if (operation === "resolve") return "resolved"
    if (operation === "dismiss") return "dismissed"
    if (operation === "reopen") return "open"
  }
  return item.state === "resolved" ? "resolved" : "open"
}
