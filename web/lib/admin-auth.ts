import { cookies } from "next/headers"

const COOKIE_NAME = "context_admin"

const ADMIN_SECRET = process.env.ADMIN_SECRET || ""
if (!ADMIN_SECRET) {
  throw new Error("ADMIN_SECRET is not set")
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  return token === ADMIN_SECRET
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
  cookieStore.delete({
    name: COOKIE_NAME,
    path: "/",
  })
}
