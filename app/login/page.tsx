import type { Metadata } from "next"
import AuthForm from "@/app/components/AuthForm"
import { getGoogleCredentials } from "@/lib/auth/google"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Prijavi se",
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <AuthForm mode="login" googleEnabled={getGoogleCredentials() !== null} />
}
