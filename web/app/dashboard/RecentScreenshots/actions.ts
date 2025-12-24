"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { desc, eq } from "drizzle-orm"

export type Screenshot = {
  id: string
  width: number
  height: number
  sizeBytes: number
  capturedAt: string
}

export async function getRecentScreenshots(): Promise<Screenshot[]> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const screenshots = await db.query.Screenshots.findMany({
    orderBy: desc(Screenshots.capturedAt),
    limit: 10,
    columns: {
      id: true,
      width: true,
      height: true,
      sizeBytes: true,
      capturedAt: true,
    },
  })

  return screenshots
}

export async function getScreenshotData(id: string): Promise<string | null> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const screenshot = await db.query.Screenshots.findFirst({
    where: eq(Screenshots.id, id),
    columns: { data: true },
  })

  return screenshot?.data ?? null
}
