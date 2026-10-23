import { redirect } from "next/navigation"

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (typeof params.callbackUrl === "string") query.set("callbackUrl", params.callbackUrl)
  if (typeof params.error === "string") query.set("error", params.error)
  redirect(query.size ? "/login?" + query.toString() : "/login")
}
