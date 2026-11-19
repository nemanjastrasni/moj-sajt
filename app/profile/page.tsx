import UiText from "@/app/components/UiText"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { EngagementPreference } from "@/app/components/Engagement"
import ProfileClient from "./ProfileClient"
import GoogleAccountLink from "@/app/components/GoogleAccountLink"
import { getGoogleCredentials } from "@/lib/auth/google"
import Link from "next/link"
import GuideText from "@/app/components/GuideText"


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
  },
})
if (!user) {
  return <div><UiText text="Korisnik nije pronađen" /></div>
}
  const { accounts, ...profile } = user
  return <>
    {getGoogleCredentials() && <div className="mx-auto max-w-xl px-10 pt-6"><GoogleAccountLink linked={accounts.length > 0} /></div>}
    <ProfileClient user={profile} />
    <EngagementPreference />
    <section className="mx-auto max-w-xl px-6 pb-10" aria-labelledby="account-deletion-title">
      <h2 id="account-deletion-title" className="mb-3 text-xl font-bold"><GuideText text={{ sr: "Brisanje naloga i podataka", en: "Account and data deletion" }} /></h2>
      <p className="mb-4 text-sm"><GuideText text={{ sr: "Možeš zatražiti trajno brisanje naloga i povezanih ličnih podataka. Zahtev se šalje mejlom i obrađuje posle provere vlasništva naloga.", en: "You can request permanent deletion of your account and associated personal data. Requests are sent by email and processed after account ownership is verified." }} /></p>
      <div className="flex flex-wrap gap-3">
        <Link className="ui-button ui-button-danger" href="/brisanje-naloga" prefetch={false}><GuideText text={{ sr: "Zatraži brisanje naloga", en: "Request account deletion" }} /></Link>
        <Link className="ui-button" href="/privatnost" prefetch={false}><GuideText text={{ sr: "Politika privatnosti", en: "Privacy policy" }} /></Link>
      </div>
    </section>
  </>
}
