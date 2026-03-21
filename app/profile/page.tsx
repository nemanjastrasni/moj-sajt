import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ProfileClient from "./ProfileClient"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return <div>Nisi ulogovan</div>
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
  favorites: {
    include: {
      song: true
    }
  }
} as any
  })

  return <ProfileClient user={user} favorites={(user as any)?.favorites} />
}