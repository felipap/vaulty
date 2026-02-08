import { db } from "@/db"
import { WriteLogs, ReadLogs } from "@/db/schema"
import { TokenIdentity } from "./api-auth"

export type WriteLogType = "screenshot" | "imessage" | "attachment" | "contact" | "whatsapp"
export type ReadLogType =
  | "screenshot"
  | "imessage"
  | "chat"
  | "contact"
  | "location"
  | "stats"
  | "whatsapp"

type LogWriteParams = {
  type: WriteLogType
  description: string
  count?: number
  metadata?: Record<string, unknown>
  token?: TokenIdentity
}

export async function logWrite({
  type,
  description,
  count = 1,
  metadata,
  token,
}: LogWriteParams) {
  await db.insert(WriteLogs).values({
    type,
    description,
    count,
    metadata: metadata ? JSON.stringify(metadata) : null,
    accessTokenId: token?.accessTokenId ?? null,
    tokenPrefix: token?.tokenPrefix ?? null,
  })
}

type LogReadParams = {
  type: ReadLogType
  description: string
  count?: number
  metadata?: Record<string, unknown>
  token?: TokenIdentity
}

export async function logRead({
  type,
  description,
  count,
  metadata,
  token,
}: LogReadParams) {
  await db.insert(ReadLogs).values({
    type,
    description,
    count,
    metadata: metadata ? JSON.stringify(metadata) : null,
    accessTokenId: token?.accessTokenId ?? null,
    tokenPrefix: token?.tokenPrefix ?? null,
  })
}
