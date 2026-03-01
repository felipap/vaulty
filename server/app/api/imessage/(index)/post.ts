import { db } from "@/db"
import { DEFAULT_USER_ID, iMessageAttachments, iMessages } from "@/db/schema"
import { logWrite } from "@/lib/activity-log"
import {
  ATTACHMENT_ENCRYPTED_COLUMNS,
  IMESSAGE_ENCRYPTED_COLUMNS,
  encryptedOrEmpty,
  encryptedRequired,
} from "@/lib/encryption-schema"
import { truncateForLog } from "@/lib/logger"
import { sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { SyncSuccessResponse, SyncErrorResponse, formatZodError, summarizeZodError } from "@/app/api/types"

const AttachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  path: z.string().optional(),
  size: z.number().optional(),
  isImage: z.boolean().optional(),
  createdAt: z.string().optional(),
  dataBase64: encryptedOrEmpty.optional(),
})

const MessageSchema = z.object({
  id: z.union([z.number(), z.string()]),
  guid: z.string(),
  text: encryptedOrEmpty.nullable(),
  contact: encryptedRequired,
  contactIndex: z.string().optional(),
  subject: encryptedOrEmpty.nullable(),
  date: z.string().nullable(),
  isFromMe: z.boolean(),
  isRead: z.boolean(),
  isSent: z.boolean(),
  isDelivered: z.boolean(),
  hasAttachments: z.boolean(),
  service: z.string(),
  chatId: z.string().nullable().optional(),
  chatName: z.string().nullable().optional(),
  attachments: z.array(AttachmentSchema).optional(),
})

type ValidatedMessage = z.infer<typeof MessageSchema>

const PostSchema = z.object({
  messages: z.array(z.unknown()),
  syncTime: z.string(),
  deviceId: z.string(),
  messageCount: z.number(),
})

function validateMessages(messages: unknown[]) {
  const validMessages: ValidatedMessage[] = []
  const rejectedMessages: Array<{
    index: number
    message: unknown
    error: string
  }> = []

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    const result = MessageSchema.safeParse(message)

    if (!result.success) {
      const error = formatZodError(result.error)
      rejectedMessages.push({ index: i, message, error })
      console.warn(
        `Rejected message at index ${i}:`,
        JSON.stringify({ message: truncateForLog(message), error }, null, 2)
      )
      continue
    }

    const parsed = result.data

    if (parsed.hasAttachments && parsed.attachments?.length) {
      const invalidAttachments = parsed.attachments.filter(
        (att) => !att.dataBase64
      )
      if (invalidAttachments.length > 0) {
        const error = `Message has ${invalidAttachments.length} attachment(s) missing dataBase64: ${invalidAttachments.map((a) => a.id).join(", ")}`
        rejectedMessages.push({ index: i, message, error })
        console.warn(
          `Rejected message attachment at index ${i}:`,
          JSON.stringify({ message: truncateForLog(message), parsed, error })
        )
        continue
      }
    }

    validMessages.push(parsed)
  }

  return { validMessages, rejectedMessages }
}

function toMessageValues(
  validMessage: ValidatedMessage,
  deviceId: string,
  syncTime: string,
  createdAt: Date
) {
  return {
    userId: DEFAULT_USER_ID,
    messageId:
      typeof validMessage.id === "string"
        ? parseInt(validMessage.id, 10) || 0
        : validMessage.id,
    guid: validMessage.guid,
    text: validMessage.text,
    contact: validMessage.contact,
    contactIndex: validMessage.contactIndex ?? null,
    subject: validMessage.subject,
    date: validMessage.date ? new Date(validMessage.date) : null,
    isFromMe: validMessage.isFromMe,
    isRead: validMessage.isRead,
    isSent: validMessage.isSent,
    isDelivered: validMessage.isDelivered,
    hasAttachments: validMessage.hasAttachments,
    service: validMessage.service,
    chatId: validMessage.chatId ?? null,
    chatName: validMessage.chatName ?? null,
    deviceId,
    syncTime: new Date(syncTime),
    createdAt,
  }
}

type InsertResult = {
  inserted: Array<{ id: string; guid: string }>
  updated: Array<{ id: string; guid: string }>
}

async function insertMessagesInBatches(
  validMessages: ValidatedMessage[],
  deviceId: string,
  syncTime: string
): Promise<InsertResult> {
  const BATCH_SIZE = 50
  const UPSERT_DAYS = 60
  const upsertCutoff = new Date()
  upsertCutoff.setDate(upsertCutoff.getDate() - UPSERT_DAYS)

  const recentMessages: ValidatedMessage[] = []
  const olderMessages: ValidatedMessage[] = []

  for (const msg of validMessages) {
    const msgDate = msg.date ? new Date(msg.date) : null
    if (msgDate && msgDate >= upsertCutoff) {
      recentMessages.push(msg)
    } else {
      olderMessages.push(msg)
    }
  }

  console.info(
    `Splitting ${validMessages.length} messages: ${recentMessages.length} recent (upsert), ${olderMessages.length} older (insert only)`
  )

  const inserted: Array<{ id: string; guid: string }> = []
  const updated: Array<{ id: string; guid: string }> = []

  if (olderMessages.length > 0) {
    const totalBatches = Math.ceil(olderMessages.length / BATCH_SIZE)
    for (let i = 0; i < olderMessages.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const batch = olderMessages.slice(i, i + BATCH_SIZE)
      const batchCreatedAt = new Date()
      const batchValues = batch.map((m) =>
        toMessageValues(m, deviceId, syncTime, batchCreatedAt)
      )

      const result = await db
        .insert(iMessages)
        .values(batchValues)
        .onConflictDoNothing()
        .returning()

      inserted.push(...result)
      console.info(
        `Older batch ${batchNumber}/${totalBatches}: Inserted ${result.length} messages`
      )
    }
  }

  if (recentMessages.length > 0) {
    const totalBatches = Math.ceil(recentMessages.length / BATCH_SIZE)
    for (let i = 0; i < recentMessages.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const batch = recentMessages.slice(i, i + BATCH_SIZE)
      const batchCreatedAt = new Date()
      const batchValues = batch.map((m) =>
        toMessageValues(m, deviceId, syncTime, batchCreatedAt)
      )

      const result = await db
        .insert(iMessages)
        .values(batchValues)
        .onConflictDoUpdate({
          target: iMessages.guid,
          set: {
            isRead: sql`excluded.is_read`,
            isDelivered: sql`excluded.is_delivered`,
            isSent: sql`excluded.is_sent`,
            syncTime: sql`excluded.sync_time`,
          },
        })
        .returning()

      for (const row of result) {
        if (row.createdAt.getTime() === batchCreatedAt.getTime()) {
          inserted.push(row)
        } else {
          updated.push(row)
        }
      }

      console.info(
        `Recent batch ${batchNumber}/${totalBatches}: Inserted ${result.filter((r) => r.createdAt.getTime() === batchCreatedAt.getTime()).length}, Updated ${result.filter((r) => r.createdAt.getTime() !== batchCreatedAt.getTime()).length} messages`
      )
    }
  }

  return { inserted, updated }
}

async function insertAttachments(
  validMessages: ValidatedMessage[],
  insertedMessages: Array<{ id: string; guid: string }>,
  deviceId: string,
  syncTime: string
) {
  const insertedAttachments = []
  const insertedGuids = new Set(insertedMessages.map((m) => m.guid))

  for (const message of validMessages) {
    if (!message.attachments || message.attachments.length === 0) {
      continue
    }

    if (!insertedGuids.has(message.guid)) {
      continue
    }

    for (const attachment of message.attachments) {
      const result = await db
        .insert(iMessageAttachments)
        .values({
          userId: DEFAULT_USER_ID,
          messageGuid: message.guid,
          attachmentId: attachment.id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          isImage: attachment.isImage ?? false,
          dataBase64: attachment.dataBase64!,
          deviceId,
          syncTime: new Date(syncTime),
        })
        .onConflictDoNothing()
        .returning()

      if (result.length > 0) {
        insertedAttachments.push(...result)
      }
    }
  }

  return insertedAttachments
}

export async function POST(request: NextRequest) {
  console.log("POST /api/imessage")

  const json = await request.json()

  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    console.warn("Invalid request body:", summarizeZodError(parsed.error))
    return NextResponse.json<SyncErrorResponse>(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const { messages, syncTime, deviceId, messageCount } = parsed.data

  console.log(
    `Received ${messageCount} iMessages from device ${deviceId} at ${syncTime}`
  )

  if (messages.length === 0) {
    return NextResponse.json<SyncSuccessResponse>({
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      rejectedCount: 0,
      skippedCount: 0,
    })
  }

  const { validMessages, rejectedMessages } = validateMessages(messages)

  const { inserted, updated } = await insertMessagesInBatches(
    validMessages,
    deviceId,
    syncTime
  )

  const insertedAttachments = await insertAttachments(
    validMessages,
    inserted,
    deviceId,
    syncTime
  )

  console.info(`Inserted ${inserted.length} iMessages`)
  console.info(`Updated ${updated.length} iMessages`)
  console.info(`Inserted ${insertedAttachments.length} attachments`)
  console.info(`Rejected ${rejectedMessages.length} invalid messages`)
  if (inserted.length > 0) {
    console.info(
      "Inserted message IDs:",
      inserted.map((m) => m.id)
    )
  }

  if (inserted.length > 0) {
    await logWrite({
      type: "imessage",
      description: `Synced encrypted messages from ${deviceId}`,
      count: inserted.length,
      metadata: {
        updatedCount: updated.length,
        rejectedCount: rejectedMessages.length,
        encrypted: true,
        encryptedColumns: IMESSAGE_ENCRYPTED_COLUMNS,
      },
    })
  }

  if (insertedAttachments.length > 0) {
    await logWrite({
      type: "attachment",
      description: `Synced encrypted attachments from ${deviceId}`,
      count: insertedAttachments.length,
      metadata: {
        encrypted: true,
        encryptedColumns: ATTACHMENT_ENCRYPTED_COLUMNS,
      },
    })
  }

  return NextResponse.json<SyncSuccessResponse>({
    success: true,
    insertedCount: inserted.length,
    updatedCount: updated.length,
    rejectedCount: rejectedMessages.length,
    skippedCount: 0,
  })
}
