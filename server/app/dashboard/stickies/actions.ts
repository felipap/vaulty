"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { MacosStickies } from "@/db/schema"
import { desc, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type StickyNote = {
  id: string
  stickyId: string
  text: string
  syncTime: Date
  updatedAt: Date
}

export type StickiesPage = {
  stickies: StickyNote[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getStickies(
  page: number = 1,
  pageSize: number = 30
): Promise<StickiesPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(MacosStickies)

  const total = countResult.count

  const results = await db.query.MacosStickies.findMany({
    orderBy: desc(MacosStickies.updatedAt),
    limit: pageSize,
    offset,
    columns: {
      id: true,
      stickyId: true,
      text: true,
      syncTime: true,
      updatedAt: true,
    },
  })

  const stickies: StickyNote[] = results.map((row) => ({
    id: row.id,
    stickyId: row.stickyId,
    text: row.text,
    syncTime: row.syncTime,
    updatedAt: row.updatedAt,
  }))

  return {
    stickies,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
