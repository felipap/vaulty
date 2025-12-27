import { db } from "@/db"
import { WriteLogs, ReadLogs } from "@/db/schema"

export type WriteLogType = "screenshot" | "imessage" | "attachment"
export type ReadLogType =
  | "screenshot"
  | "imessage"
  | "chat"
  | "contact"
  | "stats"

type LogWriteParams = {
  type: WriteLogType
  description: string
  count?: number
  metadata?: Record<string, unknown>
}

export async function logWrite({
  type,
  description,
  count = 1,
  metadata,
}: LogWriteParams) {
  await db.insert(WriteLogs).values({
    type,
    description,
    count,
    metadata: metadata ? JSON.stringify(metadata) : null,
  })
}

type LogReadParams = {
  type: ReadLogType
  description: string
  count?: number
  metadata?: Record<string, unknown>
}

export async function logRead({
  type,
  description,
  count,
  metadata,
}: LogReadParams) {
  await db.insert(ReadLogs).values({
    type,
    description,
    count,
    metadata: metadata ? JSON.stringify(metadata) : null,
  })
}
