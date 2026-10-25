import { contentAdmin } from "@/lib/adminContent/server"
import AdminContentButtons, { type ContentActions } from "./AdminContentButtons"

export default async function AdminPageActions(props: ContentActions) {
  if (!await contentAdmin()) return null
  return <AdminContentButtons {...props} />
}
