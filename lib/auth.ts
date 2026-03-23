import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {debug: true,
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
            role: (user as any).role,
            image: user.image || null, // ✅ DODATO
          }
        } catch (err) {
          throw new Error(String(err))
        }
      },
    }),

   // GoogleProvider({
     // clientId: process.env.GOOGLE_CLIENT_ID!,
      //clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //}),
  ],

  callbacks: {
    async jwt({ token, user }: any) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        token.role = (dbUser as any)?.role || "user"
        token.image = dbUser?.image || user.image || null // ✅ BITNO
      }
      return token
    },

    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role
        session.user.image = token.image // ✅ BITNO
      }
      return session
    },

    async redirect() {
      return "/" // ✅ FIX (bez TS error)
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
}