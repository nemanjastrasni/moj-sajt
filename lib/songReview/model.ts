export const reviewStatuses = ["unreviewed", "needs_fix", "verified"] as const
export type ReviewStatus = typeof reviewStatuses[number]
export const reviewLabels: Record<ReviewStatus, string> = { unreviewed: "Nije provereno", needs_fix: "Potrebna ispravka", verified: "Provereno" }
export const isReviewStatus = (value: unknown): value is ReviewStatus => typeof value === "string" && reviewStatuses.some(status => status === value)
export type ReviewState = { status: ReviewStatus; version: string }
