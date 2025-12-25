import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const COOKIE_NAME = "context_admin"

export function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.ADMIN_SECRET
  const isAuthenticated = !secret || token === secret

  const { pathname } = request.nextUrl

  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  if (pathname === "/") {
    if (isAuthenticated && secret) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
}
