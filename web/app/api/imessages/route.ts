import { db } from "@/db"
import { DEFAULT_USER_ID, iMessageAttachments, iMessages } from "@/db/schema"
import { and, eq, gte, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"
import { authMobileRequest } from "../lib"

export const GET = authMobileRequest(async (request: NextRequest) => {
  console.log("GET /api/imessages")

  const { searchParams } = new URL(request.url)
  const afterParam = searchParams.get("after")
  const contactParam = searchParams.get("contact")

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
    limit: 1000,
  })

  console.info(
    `Retrieved ${messages.length} iMessages${contactParam ? ` for contact ${contactParam}` : ""}`
  )

  return Response.json({
    success: true,
    messages,
    count: messages.length,
  })
})

export const POST = authMobileRequest(async (request: NextRequest) => {
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

  return Response.json({
    success: true,
    message: `Stored ${insertedMessages.length} iMessages and ${insertedAttachments.length} attachments`,
    messageCount: insertedMessages.length,
    attachmentCount: insertedAttachments.length,
    rejectedCount: rejectedMessages.length,
    skippedCount,
    syncedAt: new Date().toISOString(),
  })
})

interface Attachment {
  id: string
  filename: string
  mimeType: string
  path: string
  size: number
  isImage: boolean
  createdAt: string
  dataBase64?: string
}

interface FormattediMessage {
  id: number | string // Accept both for compatibility
  guid: string
  text: string | null
  contact: string
  subject: string | null
  date: string | null
  isFromMe: boolean
  isRead: boolean
  isSent: boolean
  isDelivered: boolean
  hasAttachments: boolean
  attachments?: Attachment[]
  service: string
  chatId?: string | null
  chatName?: string | null
}

function validateMessage(
  msg: unknown
):
  | { success: true; data: FormattediMessage }
  | { success: false; error: string } {
  if (typeof msg !== "object" || msg === null) {
    return { success: false, error: "Message must be an object" }
  }

  const m = msg as Record<string, unknown>

  // Accept both number and string IDs (iMessage Kit SDK uses strings)
  if (typeof m.id !== "number" && typeof m.id !== "string") {
    return { success: false, error: "id must be a number or string" }
  }
  if (typeof m.guid !== "string") {
    return { success: false, error: "guid must be a string" }
  }
  if (m.text !== null && typeof m.text !== "string") {
    return { success: false, error: "text must be a string or null" }
  }
  if (typeof m.contact !== "string") {
    return { success: false, error: "contact must be a string" }
  }
  // Validate contact format - allow:
  // - Standardized phone numbers (+1234567890)
  // - Email addresses (contain @)
  // - Short codes (digits only, like "692632")
  // - Business URNs (urn:biz:...)
  // - "Unknown" or "unknown"
  const contact = m.contact
  const isValidContact =
    contact.includes("@") || // email
    /^\+\d+$/.test(contact) || // standardized phone
    /^\d+$/.test(contact) || // short code
    contact.startsWith("urn:") || // business URN
    contact.toLowerCase() === "unknown" // unknown sender

  if (!isValidContact) {
    return {
      success: false,
      error:
        'Invalid contact format. Expected: phone (+1234...), email, short code, URN, or "Unknown"',
    }
  }
  if (m.subject !== null && typeof m.subject !== "string") {
    return { success: false, error: "subject must be a string or null" }
  }
  if (m.date !== null && typeof m.date !== "string") {
    return { success: false, error: "date must be a string or null" }
  }
  if (typeof m.isFromMe !== "boolean") {
    return { success: false, error: "isFromMe must be a boolean" }
  }
  if (typeof m.isRead !== "boolean") {
    return { success: false, error: "isRead must be a boolean" }
  }
  if (typeof m.isSent !== "boolean") {
    return { success: false, error: "isSent must be a boolean" }
  }
  if (typeof m.isDelivered !== "boolean") {
    return { success: false, error: "isDelivered must be a boolean" }
  }
  if (typeof m.hasAttachments !== "boolean") {
    return { success: false, error: "hasAttachments must be a boolean" }
  }
  if (typeof m.service !== "string") {
    return { success: false, error: "service must be a string" }
  }
  if (
    m.chatId !== undefined &&
    m.chatId !== null &&
    typeof m.chatId !== "string"
  ) {
    return {
      success: false,
      error: "chatId must be a string, null, or undefined",
    }
  }
  if (
    m.chatName !== undefined &&
    m.chatName !== null &&
    typeof m.chatName !== "string"
  ) {
    return {
      success: false,
      error: "chatName must be a string, null, or undefined",
    }
  }

  // Validate attachments if present
  if (m.attachments !== undefined) {
    if (!Array.isArray(m.attachments)) {
      return { success: false, error: "attachments must be an array" }
    }
    for (const att of m.attachments) {
      if (typeof att !== "object" || att === null) {
        return { success: false, error: "each attachment must be an object" }
      }
      const a = att as Record<string, unknown>
      if (typeof a.id !== "string") {
        return { success: false, error: "attachment.id must be a string" }
      }
      if (typeof a.filename !== "string") {
        return { success: false, error: "attachment.filename must be a string" }
      }
      if (typeof a.mimeType !== "string") {
        return { success: false, error: "attachment.mimeType must be a string" }
      }
      if (a.dataBase64 !== undefined && typeof a.dataBase64 !== "string") {
        return {
          success: false,
          error: "attachment.dataBase64 must be a string if present",
        }
      }
    }
  }

  return {
    success: true,
    data: {
      id: typeof m.id === "string" ? parseInt(m.id, 10) || 0 : m.id,
      guid: m.guid,
      text: m.text as string | null,
      contact: m.contact,
      subject: m.subject as string | null,
      date: m.date as string | null,
      isFromMe: m.isFromMe,
      isRead: m.isRead,
      isSent: m.isSent,
      isDelivered: m.isDelivered,
      hasAttachments: m.hasAttachments,
      service: m.service,
      chatId: m.chatId as string | null | undefined,
      chatName: m.chatName as string | null | undefined,
      attachments: m.attachments as Attachment[] | undefined,
    },
  }
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
  const validMessages: FormattediMessage[] = []
  const rejectedMessages: Array<{
    index: number
    message: unknown
    error: string
  }> = []

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i] as unknown
    const validationResult = validateMessage(message)

    if (!validationResult.success) {
      rejectedMessages.push({
        index: i,
        message,
        error: validationResult.error,
      })
      // Truncate message for logging (remove large base64 data)
      const truncatedMessage = truncateForLog(message)
      console.warn(
        `Rejected message at index ${i}:`,
        JSON.stringify({
          message: truncatedMessage,
          error: validationResult.error,
        })
      )
      continue
    }

    validMessages.push(validationResult.data)
  }

  return { validMessages, rejectedMessages }
}

function toMessageValues(
  validMessage: FormattediMessage,
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
  validMessages: FormattediMessage[],
  deviceId: string,
  syncTime: string
) {
  const BATCH_SIZE = 50
  const UPSERT_DAYS = 60
  const upsertCutoff = new Date()
  upsertCutoff.setDate(upsertCutoff.getDate() - UPSERT_DAYS)

  // Split messages into recent (upsert) and older (insert only)
  const recentMessages: FormattediMessage[] = []
  const olderMessages: FormattediMessage[] = []

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
  validMessages: FormattediMessage[],
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
