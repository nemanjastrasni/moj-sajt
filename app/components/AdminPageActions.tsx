import { contentAdmin } from "@/lib/adminContent/server"
import AdminContentButtons, { type ContentActions } from "./AdminContentButtons"
import { prisma } from "@/lib/prisma"
import { isReviewStatus } from "@/lib/songReview/model"
import SongReviewControl from "./SongReviewControl"

export default async function AdminPageActions({ songVersion, ...props }: ContentActions & { songVersion?: string }) {
  if (!await contentAdmin()) return null
  const review = props.kind === "song" && songVersion ? await prisma.songReview.findUnique({ where: { songId: props.id }, select: { status: true } }) : null
  const status = isReviewStatus(review?.status) ? review.status : "unreviewed"
  return <><AdminContentButtons {...props} />{props.kind === "song" && songVersion && <SongReviewControl key={props.id + songVersion + status} songId={props.id} initial={{ status, version: songVersion }} />}</>
}
