import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return Response.json({ error: "Not auth" }, { status: 401 })
  }

  const body = await req.json()

  const data: any = {}

  if (body.name) data.name = body.name
  if (body.bio) data.bio = body.bio
  if (body.city) data.city = body.city
  if (body.country) data.country = body.country
  if (body.birthYear) data.birthYear = Number(body.birthYear)
  if (body.image) data.image = body.image
  if (body.skillLevel) data.skillLevel = body.skillLevel

  // ✅ HASH PASSWORD
  if (body.password) {
    const hashed = await bcrypt.hash(body.password, 10)
    data.password = hashed
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data,
  })

  return Response.json({ ok: true })
}