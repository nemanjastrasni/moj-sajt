import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

const adminEmails = process.env.ADMIN_EMAILS?.split(",") ?? []

export const authOptions: NextAuthOptions = {
  session: {
  strategy: "jwt",
},

  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {

        const user = await prisma.user.findUnique({
          where: { email: credentials?.email }
        })

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(
          credentials!.password,
          user.password
        )

        if (!valid) return null

        return user
      }
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {

      if (user?.email) {
        token.role = adminEmails.includes(user.email)
          ? "admin"
          : "user"
      }

      if (!token.role) {
        token.role = "user"
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "admin" | "user"
      }

      return session
    },
  },
}