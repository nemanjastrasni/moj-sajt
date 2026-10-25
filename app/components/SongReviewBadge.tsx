import { CircleCheck, CircleHelp, SquarePen, TriangleAlert } from "lucide-react"
import { reviewLabels, type ReviewStatus } from "@/lib/songReview/model"
import UiText from "./UiText"
import styles from "./SongReview.module.css"

export default function SongReviewBadge({ status }: { status: ReviewStatus }) {
  const Icon = status === "verified" ? CircleCheck : status === "manually_corrected" ? SquarePen : status === "needs_fix" ? TriangleAlert : CircleHelp
  return <span className={styles.badge + " " + styles[status]} data-song-review={status}><Icon aria-hidden="true" /><UiText text={reviewLabels[status]} /></span>
}
