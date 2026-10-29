import type { ReactNode } from "react"
import { ShieldCheck } from "lucide-react"
import AdminNavigation from "./AdminNavigation"
import UiText from "@/app/components/UiText"

export default function AdminFrame({children}: {children: ReactNode}) {
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <h2 className="admin-brand"><ShieldCheck aria-hidden="true" /><UiText text="Administracija" /></h2>
      <AdminNavigation />
    </aside>
    <div className="admin-content">
      {children}
    </div>
  </div>
}
