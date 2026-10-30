import { contentAdmin } from "@/lib/adminContent/server"
import AdminContentButtons, { type ContentActions } from "./AdminContentButtons"
import { prisma } from "@/lib/prisma"
import { isReviewStatus } from "@/lib/songReview/model"
import SongReviewControl from "./SongReviewControl"
import SongTutorial from "./SongTutorial"
import styles from "./AdminContent.module.css"

export default async function AdminPageActions({ songVersion, ...props }: ContentActions & { songVersion?: string }) {
  if (!await contentAdmin()) return null
  const review = props.kind === "song" && songVersion ? await prisma.songReview.findUnique({ where: { songId: props.id }, select: { status: true } }) : null
  const status = isReviewStatus(review?.status) ? review.status : "unreviewed"
  return props.kind === "song" ? <div className={styles.songTools} data-song-admin><AdminContentButtons {...props} />{songVersion && <SongReviewControl compact key={props.id + songVersion + status} songId={props.id} initial={{ status, version: songVersion }} />}<SongTutorial songId={props.id} mode="admin" /></div> : <AdminContentButtons {...props} />
}
