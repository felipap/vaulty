// Dashboard can be protected by DASHBOARD_IP_WHITELIST. Write endpoints MUST be
// protected by API_WRITE_IP_WHITELIST. Read endpoints use DB-backed access
// tokens validated in route handlers, optionally protected by
// API_READ_IP_WHITELIST.

import {
  getClientIp,
  isIpAllowed,
  parseWhitelist,
  secureCompare,
} from "@/lib/auth-utils"
import assert from "assert"
import { createHmac } from "crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export const DASHBOARD_IP_WHITELIST = process.env.DASHBOARD_IP_WHITELIST || ""
if (!DASHBOARD_IP_WHITELIST) {
  console.error("ATTENTION: DASHBOARD_IP_WHITELIST is not set")
}

const API_READ_IP_WHITELIST = process.env.API_READ_IP_WHITELIST || ""
if (!API_READ_IP_WHITELIST) {
  console.warn("API_READ_IP_WHITELIST is not set")
}

const API_WRITE_IP_WHITELIST = process.env.API_WRITE_IP_WHITELIST
if (!API_WRITE_IP_WHITELIST) {
  console.warn("API_WRITE_IP_WHITELIST is not set")
}

const API_WRITE_SECRET = process.env.API_WRITE_SECRET || ""
if (!API_WRITE_SECRET) {
  throw Error("API_WRITE_SECRET is not set")
}
assert(API_WRITE_SECRET.length > 10, "API_WRITE_SECRET is too short")

const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET || ""
if (!DASHBOARD_SECRET) {
  throw Error("DASHBOARD_SECRET is not set")
}
assert(DASHBOARD_SECRET.length > 20, "DASHBOARD_SECRET is too short")

const COOKIE_NAME = "context_admin"

// Must match the token generation in admin-auth.ts
function generateAuthToken(secret: string): string {
  return createHmac("sha256", secret).update("context_admin_auth").digest("hex")
}

const EXPECTED_DASHBOARD_TOKEN = generateAuthToken(DASHBOARD_SECRET)

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cron routes are only protected by CRON_SECRET
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next()
  }

  // API routes
  if (pathname.startsWith("/api/")) {
    // Check if IP is whitelisted, then check the secret.
    //
    // Read and write handlers MAY be protected by IP whitelist. For writing,
    // it'd require users of the Vaulty desktop app to be behind a fixed IP,
    // which is hard to do. Reading use-cases will depend on what users do with
    // their context.

    const isWriteEndpoint = isApiWriteRequest(request)
    if (isWriteEndpoint) {
      if (API_WRITE_IP_WHITELIST) {
        // Validate that request IP is allowed.
        const whitelist = parseWhitelist(API_WRITE_IP_WHITELIST)
        const ip = getClientIp(request)
        if (!isIpAllowed(ip, whitelist)) {
          console.debug(`🔺 ${pathname}: IP address not allowed`, ip)
          return makeNonWhitelistedResponse()
        }
      } else {
        warnUnprotected("Write endpoint is not protected by IP whitelist")
      }
    } else {
      // Read endpoints MUST be protected by
      if (API_READ_IP_WHITELIST) {
        // Validate that request IP is allowed.
        const whitelist = parseWhitelist(API_READ_IP_WHITELIST)
        const ip = getClientIp(request)
        if (!isIpAllowed(ip, whitelist)) {
          console.debug(`🔺 ${pathname}: IP address not allowed`, ip)
          return makeNonWhitelistedResponse()
        }
      } else {
        warnUnprotected("Read endpoint is not protected by IP whitelist")
      }
    }

    // We check the token after because we treat whitelists first, to give back
    // the smallest amount of information possible.

    if (isWriteEndpoint) {
      const token = getBearerToken(request)
      if (!token) {
        return makeNonWhitelistedResponse()
      }
      if (!secureCompare(token, API_WRITE_SECRET)) {
        console.debug(`/api: Unauthorized (token mismatch)`)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }
    // Read endpoints use DB-backed access tokens, validated in route handlers
    // via requireReadAuth()

    return NextResponse.next()
  }

  // Validate dashboard access
  if (pathname.startsWith("/dashboard")) {
    // if IP whitelist is enabled,
    if (DASHBOARD_IP_WHITELIST) {
      // validate that the request IP.
      const whitelist = parseWhitelist(DASHBOARD_IP_WHITELIST)
      const ip = getClientIp(request)
      if (!isIpAllowed(ip, whitelist)) {
        console.debug("/dashboard: IP address not allowed", ip)
        return makeNonWhitelistedResponse()
      }
    } else {
      warnUnprotected("Dashboard is not protected by IP whitelist")
    }

    const cookieToken = getDashboardTokenFromCookie(request)
    if (!cookieToken) {
      console.debug("/dashboard: Unauthorized (token missing)")
      return NextResponse.redirect(new URL("/sign-in", request.url))
    }
    if (!secureCompare(cookieToken, EXPECTED_DASHBOARD_TOKEN)) {
      console.debug("/dashboard: Unauthorized (token mismatch)")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/sign-in", "/dashboard/:path*", "/api/:path*"],
}

function isApiWriteRequest(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith("/api")) {
    throw Error("only use fn with API routes")
  }
  return (
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "DELETE" ||
    request.method === "PATCH"
  )
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }
  return authHeader.slice(7)
}

function getDashboardTokenFromCookie(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value
}

function warnUnprotected(message: string) {
  // TODO something more dramatic?
  console.warn("🥊 WARNING:", message)
}

// Return 404 instead of 403 to avoid revealing that a protected resource
// exists.
function makeNonWhitelistedResponse() {
  return new NextResponse(null, { status: 404 })
}
