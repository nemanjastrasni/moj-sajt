import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token

    // ako nije admin → kući
    if (token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // mora biti ulogovan da bi middleware uopšte prošao
        return !!token
      },
    },
  }
)

// 🔒 štitimo samo admin rute
export const config = {
  matcher: ["/admin/:path*"],
}