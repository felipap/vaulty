import { db } from "@/db"
import { DEFAULT_USER_ID, iMessageAttachments, iMessages } from "@/db/schema"
import { logRead, logWrite } from "@/lib/activity-log"
import {
  ATTACHMENT_ENCRYPTED_COLUMNS,
  IMESSAGE_ENCRYPTED_COLUMNS,
} from "@/lib/encryption-schema"
import { and, eq, gte, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"

const ENCRYPTED_PREFIX = "enc:v1:"

function isEncrypted(text: string): boolean {
  return text.startsWith(ENCRYPTED_PREFIX)
}

const encryptedOrEmpty = z.string().refine((s) => s === "" || isEncrypted(s), {
  message: "must be encrypted (missing enc:v1: prefix)",
})

const contactFormat = z.string().refine(
  (contact) =>
    contact.includes("@") || // email
    /^\+\d+$/.test(contact) || // standardized phone
    /^\d+$/.test(contact) || // short code
    contact.startsWith("urn:") || // business URN
    contact.toLowerCase() === "unknown", // unknown sender
  {
    message:
      'Invalid contact format. Expected: phone (+1234...), email, short code, URN, or "Unknown"',
  }
)

const AttachmentSchema = z.object({
  // Required - validated in original code
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  // Optional - not validated in original, but used in insert
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
  contact: contactFormat,
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

const MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  console.log("GET /api/imessages")

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit") || "20"
  const offsetParam = searchParams.get("offset")
  const afterParam = searchParams.get("after")
  const contactParam = searchParams.get("contact")

  // if (!limitParam) {
  //   limitParam = "20"
  //   // return Response.json(
  //   //   { error: "limit query parameter is required" },
  //   //   { status: 400 }
  //   // )
  // }

  const limit = parseInt(limitParam, 10)
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  if (isNaN(limit) || limit < 1) {
    return Response.json(
      { error: "limit must be a positive integer" },
      { status: 400 }
    )
  }

  if (limit > MAX_LIMIT) {
    return Response.json(
      { error: `limit must not exceed ${MAX_LIMIT}` },
      { status: 400 }
    )
  }

  if (isNaN(offset) || offset < 0) {
    return Response.json(
      { error: "offset must be a non-negative integer" },
      { status: 400 }
    )
  }

  const conditions = [eq(iMessages.userId, DEFAULT_USER_ID)]

  if (contactParam) {
    conditions.push(eq(iMessages.contact, contactParam))
  }

  if (afterParam) {
    const afterDate = new Date(afterParam)
    if (isNaN(afterDate.getTime())) {
      return Response.json(
        { error: 'Invalid date format for "after" parameter' },
        { status: 400 }
      )
    }
    conditions.push(gte(iMessages.date, afterDate))
  }

  const messages = await db.query.iMessages.findMany({
    where: and(...conditions),
    orderBy: (iMessages, { asc }) => [asc(iMessages.date)],
    limit,
    offset,
  })

  console.info(
    `Retrieved ${messages.length} iMessages${contactParam ? ` for contact ${contactParam}` : ""}`
  )

  await logRead({
    type: "imessage",
    description: contactParam
      ? `Fetched messages for ${contactParam}`
      : "Fetched messages",
    count: messages.length,
  })

  return Response.json({
    success: true,
    messages,
    count: messages.length,
    page: {
      limit,
      offset,
    },
  })
}

export async function POST(request: NextRequest) {
  console.log("POST /api/imessages")

  const json = await request.json()

  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    console.warn("Invalid request body", { error: parsed.error })
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  const { messages, syncTime, deviceId, messageCount } = parsed.data

  console.log(
    `Received ${messageCount} iMessages from device ${deviceId} at ${syncTime}`
  )

  if (messages.length === 0) {
    return Response.json({
      success: true,
      message: "No messages to sync",
      messageCount: 0,
      syncedAt: new Date().toISOString(),
    })
  }

  const { validMessages, rejectedMessages } = validateMessages(messages)

  const insertedMessages = await insertMessagesInBatches(
    validMessages,
    deviceId,
    syncTime
  )

  // Insert attachments for messages that have them
  const insertedAttachments = await insertAttachments(
    validMessages,
    insertedMessages,
    deviceId,
    syncTime
  )

  const skippedCount = validMessages.length - insertedMessages.length

  console.info(`Inserted ${insertedMessages.length} iMessages`)
  console.info(`Inserted ${insertedAttachments.length} attachments`)
  console.info(`Skipped ${skippedCount} duplicate messages`)
  console.info(`Rejected ${rejectedMessages.length} invalid messages`)
  if (insertedMessages.length > 0) {
    console.info(
      "Inserted message IDs:",
      insertedMessages.map((m) => m.id)
    )
  }

  if (insertedMessages.length > 0) {
    await logWrite({
      type: "imessage",
      description: `Synced encrypted messages from ${deviceId}`,
      count: insertedMessages.length,
      metadata: {
        skippedCount,
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

  return Response.json({
    success: true,
    message: `Stored ${insertedMessages.length} encrypted iMessages and ${insertedAttachments.length} encrypted attachments`,
    messageCount: insertedMessages.length,
    attachmentCount: insertedAttachments.length,
    rejectedCount: rejectedMessages.length,
    skippedCount,
    encrypted: true,
    syncedAt: new Date().toISOString(),
  })
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""
      return `${path}${issue.message}`
    })
    .join("; ")
}

function truncateForLog(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) {
    return obj
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === "dataBase64" && typeof value === "string") {
      result[key] = `[base64 ${value.length} chars]`
    } else if (key === "attachments" && Array.isArray(value)) {
      result[key] = value.map((att) => truncateForLog(att))
    } else {
      result[key] = value
    }
  }
  return result
}

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
      const truncatedMessage = truncateForLog(message)
      console.warn(
        `Rejected message at index ${i}:`,
        JSON.stringify({ message: truncatedMessage, error })
      )
      continue
    }

    validMessages.push(result.data)
  }

  return { validMessages, rejectedMessages }
}

function toMessageValues(
  validMessage: ValidatedMessage,
  deviceId: string,
  syncTime: string
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
    subject: validMessage.subject,
    date: validMessage.date ? new Date(validMessage.date) : null,
    isFromMe: validMessage.isFromMe ? 1 : 0,
    isRead: validMessage.isRead ? 1 : 0,
    isSent: validMessage.isSent ? 1 : 0,
    isDelivered: validMessage.isDelivered ? 1 : 0,
    hasAttachments: validMessage.hasAttachments ? 1 : 0,
    service: validMessage.service,
    chatId: validMessage.chatId ?? null,
    chatName: validMessage.chatName ?? null,
    deviceId,
    syncTime: new Date(syncTime),
  }
}

async function insertMessagesInBatches(
  validMessages: ValidatedMessage[],
  deviceId: string,
  syncTime: string
) {
  const BATCH_SIZE = 50
  const UPSERT_DAYS = 60
  const upsertCutoff = new Date()
  upsertCutoff.setDate(upsertCutoff.getDate() - UPSERT_DAYS)

  // Split messages into recent (upsert) and older (insert only)
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

  const insertedMessages: Array<{ id: string; guid: string }> = []

  // Insert older messages with onConflictDoNothing
  if (olderMessages.length > 0) {
    const totalBatches = Math.ceil(olderMessages.length / BATCH_SIZE)
    for (let i = 0; i < olderMessages.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const batch = olderMessages.slice(i, i + BATCH_SIZE)
      const batchValues = batch.map((m) =>
        toMessageValues(m, deviceId, syncTime)
      )

      const result = await db
        .insert(iMessages)
        .values(batchValues)
        .onConflictDoNothing()
        .returning()

      insertedMessages.push(...result)
      console.info(
        `Older batch ${batchNumber}/${totalBatches}: Inserted ${result.length} messages`
      )
    }
  }

  // Upsert recent messages to update isRead, isDelivered, isSent
  if (recentMessages.length > 0) {
    const totalBatches = Math.ceil(recentMessages.length / BATCH_SIZE)
    for (let i = 0; i < recentMessages.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const batch = recentMessages.slice(i, i + BATCH_SIZE)
      const batchValues = batch.map((m) =>
        toMessageValues(m, deviceId, syncTime)
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

      insertedMessages.push(...result)
      console.info(
        `Recent batch ${batchNumber}/${totalBatches}: Upserted ${result.length} messages`
      )
    }
  }

  return insertedMessages
}

async function insertAttachments(
  validMessages: ValidatedMessage[],
  insertedMessages: Array<{ id: string; guid: string }>,
  deviceId: string,
  syncTime: string
) {
  const insertedAttachments = []
  const messageGuidMap = new Map(insertedMessages.map((m) => [m.guid, m.id]))

  for (const message of validMessages) {
    if (!message.attachments || message.attachments.length === 0) {
      continue
    }

    const messageId = messageGuidMap.get(message.guid)
    if (!messageId) {
      // Message wasn't inserted (duplicate), skip attachments
      continue
    }

    for (const attachment of message.attachments) {
      // Only insert if we have base64 data
      if (!attachment.dataBase64) {
        console.warn(
          `Skipping attachment ${attachment.id} for message ${message.guid}: no base64 data`
        )
        continue
      }

      const result = await db
        .insert(iMessageAttachments)
        .values({
          userId: DEFAULT_USER_ID,
          messageGuid: message.guid,
          attachmentId: attachment.id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          isImage: attachment.isImage ? 1 : 0,
          dataBase64: attachment.dataBase64,
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

const PostSchema = z.object({
  messages: z.array(z.unknown()),
  syncTime: z.string(),
  deviceId: z.string(),
  messageCount: z.number(),
})
