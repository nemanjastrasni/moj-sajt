import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && googleClientSecret
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: googleClientSecret,
        }),
      ]
    : []

export const authOptions: NextAuthOptions = {
  debug: true,

  session: {
    strategy: "jwt",
  },
  

  providers: [
    ...googleProvider,
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        console.log("LOGIN START")

        if (!credentials?.email || !credentials?.password) {
          console.log("NO CREDENTIALS")
          return null
        }

        console.log("EMAIL INPUT:", credentials.email)

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        console.log("USER FROM DB:", user)

        if (!user) {
          console.log("NO USER")
          return null
        }

        if (!user.password) {
          console.log("NO PASSWORD IN DB")
          return null
        }

        console.log("HASH FROM DB:", user.password)

        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        console.log("PASSWORD VALID:", valid)

        if (!valid) {
          console.log("WRONG PASSWORD")
          return null
        }

        console.log("SUCCESS LOGIN")

        return {
  id: String(user.id),
  email: user.email,
  name: user.name ?? null,
}
      },
    }),
  ],

  callbacks: {
  async signIn({ user }) {
    if (!user.email) return false

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name ?? undefined,
        image: user.image ?? undefined,
      },
      create: {
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      },
    })

    return true
  },

  async jwt({ token, user }) {
    if (user) {
      token.email = user.email
      token.image = user.image
    }

    if (token.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: token.email },
      })

      if (dbUser) {
  token.id = dbUser.id
  token.role = dbUser.role === "admin" ? "admin" : "user"
  token.name = dbUser.name
}
    }

    return token
  },

  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string
      session.user.email = token.email as string
      session.user.role = token.role as string

      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
      })

      session.user.name = dbUser?.name || null
    }
    return session
  },

  async redirect() {
    return "/"
  },
},

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
}
