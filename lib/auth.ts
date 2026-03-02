import GitHubProvider from "next-auth/providers/github"
import type { NextAuthOptions } from "next-auth"

const adminEmails = process.env.ADMIN_EMAILS?.split(",") ?? []

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      console.log("JWT USER:", user)
      console.log("ADMIN EMAILS:", adminEmails)

      if (user?.email) {
        token.role = adminEmails.includes(user.email)
          ? "admin"
          : "user"
      }

      if (!token.role) {
        token.role = "user"
      }

      console.log("FINAL TOKEN ROLE:", token.role)

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "admin" | "user"
      }

      console.log("SESSION ROLE:", session.user?.role)

      return session
    },
  },
}