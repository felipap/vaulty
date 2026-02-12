import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  throw new Error("CRON_SECRET environment variable is not set")
}

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

export function verifyCronAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization")
  const expectedHeader = `Bearer ${CRON_SECRET}`
  if (!authHeader || !secureCompare(authHeader, expectedHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
