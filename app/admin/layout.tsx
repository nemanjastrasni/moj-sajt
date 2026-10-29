// app/admin/layout.tsx
import { redirect } from "next/navigation"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { SubmissionError } from "@/lib/submissions/validation"
import AdminFrame from "./AdminFrame"
import "./admin.css"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try { await requireSongAdmin() }
  catch (error) {
    if (error instanceof SubmissionError && error.status === 401) redirect("/login?callbackUrl=%2Fadmin")
    if (error instanceof SubmissionError && error.status === 403) redirect("/")
    throw error
  }

  return <AdminFrame>{children}</AdminFrame>
}
