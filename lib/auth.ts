import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: credentials?.email },
    })

    if (!user || !user.password) return null

    const valid = await bcrypt.compare(
      credentials!.password,
      user.password
    )

    if (!valid) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  } catch (err) {
    console.log("AUTH ERROR:", err)
    return null
  }
}
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,
}