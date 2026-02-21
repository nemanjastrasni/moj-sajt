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