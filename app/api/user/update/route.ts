import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import bcrypt from "bcrypt"

export async function POST(req: Request) {
   const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
    return Response.json({ error: "Not auth" }, { status: 401 })
  }

      const body = await req.json()

      const data: any = {}

    if (body.name) data.name = body.name
    if (body.image) data.image = body.image

    if (body.password && !body.password.startsWith("$2b$")) {
  data.password = await bcrypt.hash(body.password, 10)
    if (body.city) data.city = body.city
    if (body.country) data.country = body.country
    if (body.birthYear) data.birthYear = Number(body.birthYear)
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data
  })

  return Response.json({ ok: true })
}