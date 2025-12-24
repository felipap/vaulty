"use server"

import {
  setAuthCookie,
  clearAuthCookie,
  isAuthenticated,
} from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { Devices, Screenshots } from "@/db/schema"
import { sql, desc } from "drizzle-orm"

export type DashboardStats = {
  totalScreenshots: number
  totalStorageBytes: number
}

export type Device = {
  id: string
  deviceId: string
  name: string | null
  approved: boolean
  lastSeenAt: string | null
  createdAt: string
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

export async function getDevices(): Promise<Device[]> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const allDevices = await db.query.Devices.findMany({
    orderBy: [desc(Devices.createdAt)],
  })

  return allDevices
}

export async function approveDevice(id: string): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const [updated] = await db
    .update(Devices)
    .set({ approved: true })
    .where(eq(Devices.id, id))
    .returning()

  if (!updated) {
    throw new Error("Device not found")
  }
}

export async function deleteDevice(id: string): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const [deleted] = await db
    .delete(Devices)
    .where(eq(Devices.id, id))
    .returning()

  if (!deleted) {
    throw new Error("Device not found")
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
  redirect("/")
}
