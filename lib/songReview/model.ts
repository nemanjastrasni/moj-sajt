export const reviewStatuses = ["unreviewed", "needs_fix", "manually_corrected", "verified"] as const
export type ReviewStatus = typeof reviewStatuses[number]
export const reviewLabels: Record<ReviewStatus, string> = { unreviewed: "Nije provereno", needs_fix: "Potrebna ispravka", manually_corrected: "Ispravljeno ru\u010dno", verified: "Provereno" }
export const isReviewStatus = (value: unknown): value is ReviewStatus => typeof value === "string" && reviewStatuses.some(status => status === value)
export type ReviewState = { status: ReviewStatus; version: string }
