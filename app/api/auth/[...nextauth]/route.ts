import NextAuth from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

const handler = NextAuth({
  pages: {
  signIn: "/api/auth/signin",
},
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],

  callbacks: {

  async jwt({ token }) {

    if (token.email === "nemanjaivanovic979@gmail.com") {
      token.role = "admin"
    } else {
      token.role = "user"
    }

    return token
  },

  async session({ session, token }) {
    if (session.user) {
      session.user.role = token.role
    }
    return session
  },

  async redirect({ url, baseUrl }) {
    return baseUrl
  },

},
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }