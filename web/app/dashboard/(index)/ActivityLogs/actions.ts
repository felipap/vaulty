"use server"

import { db } from "@/db"
import { WriteLogs, ReadLogs } from "@/db/schema"
import { desc } from "drizzle-orm"

export type WriteLogEntry = {
  id: string
  type: string
  description: string
  count: number
  metadata: string | null
  tokenPrefix: string | null
  createdAt: Date
}

export type ReadLogEntry = {
  id: string
  type: string
  description: string
  count: number | null
  metadata: string | null
  tokenPrefix: string | null
  createdAt: Date
}

export async function getRecentWriteLogs(limit = 20): Promise<WriteLogEntry[]> {
  return db.query.WriteLogs.findMany({
    orderBy: [desc(WriteLogs.createdAt)],
    limit,
  })
}

export async function getRecentReadLogs(limit = 20): Promise<ReadLogEntry[]> {
  return db.query.ReadLogs.findMany({
    orderBy: [desc(ReadLogs.createdAt)],
    limit,
  })
}
