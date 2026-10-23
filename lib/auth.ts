import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { getGoogleCredentials } from "@/lib/auth/google"
import { isValidEmail, normalizeEmail } from "@/lib/auth/validation"

const googleCredentials = getGoogleCredentials()
const sessionUserSelect = {
  id: true, email: true, name: true, image: true, role: true, banned: true,
} as const

export const authOptions: NextAuthOptions = {
  debug: false,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...(googleCredentials ? [GoogleProvider({
      ...googleCredentials,
      profile(profile) {
        return { id: profile.sub, name: profile.name, email: normalizeEmail(profile.email), image: profile.picture }
      },
    })] : []),
    CredentialsProvider({
      name: "Email i lozinka",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email)
        if (!isValidEmail(email) || !credentials?.password || credentials.password.length > 4096) return null
        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: { ...sessionUserSelect, password: true },
          })
          if (!user?.password || user.banned) return null
          if (!await bcrypt.compare(credentials.password, user.password)) return null
          return { id: user.id, email: user.email, name: user.name, image: user.image }
        } catch {
          throw new Error("ServiceUnavailable")
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "credentials") return true
      if (account?.provider !== "google" || !profile) return false
      const google = profile as GoogleProfile
      const email = normalizeEmail(google.email)
      if (google.email_verified !== true || !isValidEmail(email) || !account.providerAccountId) return false

      try {
        return await prisma.$transaction(async (tx) => {
          const linked = await tx.account.findUnique({
            where: { provider_providerAccountId: {
              provider: "google", providerAccountId: account.providerAccountId,
            } },
            include: { user: { select: sessionUserSelect } },
          })
          if (linked) return !linked.user.banned

          const existing = await tx.user.findUnique({
            where: { email },
            select: { ...sessionUserSelect, password: true, emailVerified: true },
          })
          if (existing?.banned) return false
          // Migrate passwordless Google users created before the adapter was enabled.
          // Password accounts are linked only by NextAuth after a prior authenticated login.
          if (existing && !existing.password) {
            if (!email.endsWith("@gmail.com") && !google.hd) return false
            if (await tx.account.findFirst({ where: { userId: existing.id, provider: "google" } })) return false
            await tx.account.create({
              data: { userId: existing.id, type: "oauth", provider: "google", providerAccountId: account.providerAccountId },
            })
          }
          return true
        })
      } catch {
        throw new Error("ServiceUnavailable")
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      // Refresh identity and bans once per session check, not again in session().
      const dbUser = token.id
        ? await prisma.user.findUnique({ where: { id: token.id }, select: sessionUserSelect })
        : token.email
          ? await prisma.user.findUnique({ where: { email: token.email }, select: sessionUserSelect })
          : null
      if (!dbUser || dbUser.banned) throw new Error("Session no longer valid")
      token.id = dbUser.id
      token.sub = dbUser.id
      token.email = dbUser.email
      token.role = dbUser.role === "admin" ? "admin" : "user"
      token.name = dbUser.name
      token.picture = dbUser.image
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email ?? null
        session.user.role = token.role === "admin" ? "admin" : "user"
        session.user.name = token.name ?? null
        session.user.image = token.picture ?? null
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email && normalizeEmail(profile.email) === user.email) {
        await prisma.user.updateMany({
          where: { id: user.id, emailVerified: null },
          data: { emailVerified: new Date() },
        })
      }
    },
  },
  pages: { signIn: "/login", error: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
}
