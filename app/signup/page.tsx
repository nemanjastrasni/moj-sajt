import type { Metadata } from "next"
import AuthForm from "@/app/components/AuthForm"
import { getGoogleCredentials } from "@/lib/auth/google"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Registracija",
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return <AuthForm mode="signup" googleEnabled={getGoogleCredentials() !== null} />
}
