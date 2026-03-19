import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if ((session?.user as any)?.role !== "admin") {
    return <div>NO ACCESS</div>
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-4">
        Admin panel
      </h1>

      <p className="text-gray-600">
        Dobrodošao, najlepši admine od svih admina.:)
      </p>
    </div>
  )
}