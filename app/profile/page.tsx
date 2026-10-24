import UiText from "@/app/components/UiText"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ProfileClient from "./ProfileClient"
import GoogleAccountLink from "@/app/components/GoogleAccountLink"
import { getGoogleCredentials } from "@/lib/auth/google"


export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return <div><UiText text="Nisi ulogovan" /></div>
  }

  const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: {
    id: true,
    name: true,
    email: true,
    image: true,
    bio: true,
    city: true,
    country: true,
    birthDay: true,
    birthMonth: true,
    birthYear: true,
    skillLevel: true,
    accounts: { where: { provider: "google" }, select: { id: true } },
    favorites: {
      include: {
        song: true,
      },
    },
  },
})
if (!user) {
  return <div><UiText text="Korisnik nije pronađen" /></div>
}
  const { accounts, favorites, ...profile } = user
  return <>
    {getGoogleCredentials() && <div className="mx-auto max-w-xl px-10 pt-6"><GoogleAccountLink linked={accounts.length > 0} /></div>}
    <ProfileClient user={profile} favorites={favorites} />
  </>
}
