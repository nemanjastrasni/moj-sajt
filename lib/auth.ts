import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  debug: true,

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
          role: (user as any).role,
          image: user.image || null,
        }
      },
    }),
  ],

  callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id
      token.email = user.email
      token.role = user.role
    }
    return token
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string
      session.user.email = token.email as string
      session.user.role = token.role as string
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