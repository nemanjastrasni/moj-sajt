import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { validateSignup, MAX_SIGNUP_BYTES } from "@/lib/auth/validation"
import { readLimitedJson, RequestBodyError } from "@/lib/auth/request"

export async function POST(req: Request) {
  try {
    const input = validateSignup(await readLimitedJson(req, MAX_SIGNUP_BYTES))
    if (input.error) return NextResponse.json({ error: input.error }, { status: 400 })
    const { password, ...data } = input.data!
    const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: "Nalog sa ovim emailom vec postoji. Pokusaj prijavu." }, { status: 409 })
    }
    await prisma.user.create({
      data: { ...data, password: await bcrypt.hash(password, 12) },
      select: { id: true },
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Nalog sa ovim emailom vec postoji. Pokusaj prijavu." }, { status: 409 })
    }
    return NextResponse.json({ error: "Registracija trenutno nije dostupna. Pokusaj kasnije." }, { status: 503 })
  }
}
