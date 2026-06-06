import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export async function POST(req: Request) {
  const { name, email, password, image } = await req.json()
  const normalizedEmail = String(email || "").trim().toLowerCase()

  if (!name || !normalizedEmail || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must have at least 8 characters" },
      { status: 400 }
    )
  }
  
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })

  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
    name,
  email: normalizedEmail,
  password: hashedPassword,
  image
}
  })

  return NextResponse.json({ user })
}
