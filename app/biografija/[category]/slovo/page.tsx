import { redirect } from "next/navigation"

export default function Page({ params }: any) {
  const { category } = params
  return redirect(`/biografija/${category}`)
}