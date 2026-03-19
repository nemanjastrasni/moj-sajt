import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
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
    if (!credentials?.email || !credentials?.password) return null

    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    })

    if (!user || !user.password) return null

    const valid = await bcrypt.compare(
      credentials.password,
      user.password
    )

    if (!valid) return null

    return {
      id: String(user.id),
      email: user.email,
      name: user.name ?? null,
    }
  } catch (err) {
    throw new Error(String(err))
  }
}
    }),
    GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
}),
  ],
  callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = (user as any).role || "user"
    }
    return token
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as any).role = token.role
    }
    return session
  },
},

  secret: process.env.NEXTAUTH_SECRET,
}
