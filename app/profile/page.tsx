import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return <div>Nisi ulogovan</div>
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  return (
    <div className="p-10 max-w-xl mx-auto">
      
      <h1 className="text-3xl font-bold mb-4">Profil</h1>

      <p><b>Ime:</b> {user?.name}</p>
      <p><b>Email:</b> {user?.email}</p>
      <p><b>Bio:</b> {(user as any)?.bio || "Nema"}</p>

    </div>
  )
}