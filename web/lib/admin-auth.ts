import { cookies } from "next/headers"

const COOKIE_NAME = "context_admin"

export async function isAuthenticated(): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    // No secret configured = no auth required (for development)
    return true
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  return token === secret
}

export async function setAuthCookie(secret: string): Promise<boolean> {
  const expected = process.env.ADMIN_SECRET
  if (!expected || secret !== expected) {
    return false
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  })
  return true
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}


