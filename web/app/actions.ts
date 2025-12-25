"use server"

import {
  setAuthCookie,
  clearAuthCookie,
  isAuthenticated,
} from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { sql } from "drizzle-orm"

export type DashboardStats = {
  totalScreenshots: number
  totalStorageBytes: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const [countResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalBytes: sql<number>`coalesce(sum(${Screenshots.sizeBytes}), 0)::int`,
    })
    .from(Screenshots)

  return {
    totalScreenshots: countResult.count,
    totalStorageBytes: countResult.totalBytes,
  }
}

export async function login(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const passphrase = formData.get("passphrase") as string

  if (!passphrase) {
    return { error: "Passphrase required" }
  }

  const success = await setAuthCookie(passphrase)
  if (!success) {
    return { error: "Invalid passphrase" }
  }

  redirect("/dashboard")
}

export async function logout(): Promise<void> {
  await clearAuthCookie()
  revalidatePath("/", "layout")
  redirect("/")
}
