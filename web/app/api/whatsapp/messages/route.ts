import { db } from "@/db"
import { DEFAULT_USER_ID, WhatsappMessages } from "@/db/schema"
import { logRead, logWrite } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"
import { WHATSAPP_ENCRYPTED_COLUMNS } from "@/lib/encryption-schema"
import { and, eq, gte } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"

const ENCRYPTED_PREFIX = "enc:v1:"

function isEncrypted(text: string): boolean {
  return text.startsWith(ENCRYPTED_PREFIX)
}

const encryptedOrEmpty = z.string().refine((s) => s === "" || isEncrypted(s), {
  message: "must be encrypted (missing enc:v1: prefix)",
})

// TODO: implement attachment syncing
// const AttachmentSchema = z.object({
//   id: z.string(),
//   filename: z.string().nullable(),
//   mimeType: z.string().nullable(),
//   size: z.number().nullable(),
//   localPath: z.string().nullable(),
//   dataBase64: encryptedOrEmpty.nullable(),
// })

const MessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  chatName: encryptedOrEmpty.nullable().optional(),
  chatNameIndex: z.string().nullable().optional(), // HMAC blind index for search
  text: encryptedOrEmpty.nullable(),
  senderJid: z.string().nullable(),
  senderName: encryptedOrEmpty.nullable(),
  senderNameIndex: z.string().nullable().optional(), // HMAC blind index for search
  senderPhoneNumber: encryptedOrEmpty.nullable(),
  senderPhoneNumberIndex: z.string().nullable().optional(), // HMAC blind index for search
  timestamp: z.string(),
  isFromMe: z.boolean(),
  chatIsGroupChat: z.boolean(),
  attachments: z.array(z.unknown()).optional(), // TODO: implement attachment syncing
})

type ValidatedMessage = z.infer<typeof MessageSchema>

const PostSchema = z.object({
  messages: z.array(z.unknown()),
  syncTime: z.string(),
  deviceId: z.string(),
  messageCount: z.number(),
})

const MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "whatsapp")
  if (!auth.authorized) { return auth.response }

  console.log("GET /api/whatsapp/messages")

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit") || "20"
  const offsetParam = searchParams.get("offset")
  const afterParam = searchParams.get("after")
  const chatIdParam = searchParams.get("chatId")

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

  const conditions = [eq(WhatsappMessages.userId, DEFAULT_USER_ID)]

  if (chatIdParam) {
    conditions.push(eq(WhatsappMessages.chatId, chatIdParam))
  }

  if (afterParam) {
    const afterDate = new Date(afterParam)
    if (isNaN(afterDate.getTime())) {
      return Response.json(
        { error: 'Invalid date format for "after" parameter' },
        { status: 400 }
      )
    }
    conditions.push(gte(WhatsappMessages.timestamp, afterDate))
  }

  const messages = await db.query.WhatsappMessages.findMany({
    where: and(...conditions),
    orderBy: (messages, { asc }) => [asc(messages.timestamp)],
    limit,
    offset,
  })

  console.info(
    `Retrieved ${messages.length} WhatsApp messages${chatIdParam ? ` for chat ${chatIdParam}` : ""}`
  )

  await logRead({
    type: "whatsapp",
    description: chatIdParam
      ? `Fetched messages for chat ${chatIdParam}`
      : "Fetched WhatsApp messages",
    count: messages.length,
    token: auth.token,
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
  console.log("POST /api/whatsapp/messages")

  const json = await request.json()

  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    console.warn("Invalid request body", { error: parsed.error })
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  const { messages, syncTime, deviceId, messageCount } = parsed.data

  console.log(
    `Received ${messageCount} WhatsApp messages from device ${deviceId} at ${syncTime}`
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

  const skippedCount = validMessages.length - insertedMessages.length

  console.info(`Inserted ${insertedMessages.length} WhatsApp messages`)
  console.info(`Skipped ${skippedCount} duplicate messages`)
  console.info(`Rejected ${rejectedMessages.length} invalid messages`)

  if (insertedMessages.length > 0) {
    await logWrite({
      type: "whatsapp",
      description: `Synced encrypted WhatsApp messages from ${deviceId}`,
      count: insertedMessages.length,
      metadata: {
        skippedCount,
        rejectedCount: rejectedMessages.length,
        encrypted: true,
        encryptedColumns: WHATSAPP_ENCRYPTED_COLUMNS,
      },
    })
  }

  return Response.json({
    success: true,
    message: `Stored ${insertedMessages.length} encrypted WhatsApp messages`,
    messageCount: insertedMessages.length,
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
      console.warn(
        `Rejected WhatsApp message at index ${i}:`,
        JSON.stringify({ message: truncateForLog(message), error }, null, 2)
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
    messageId: validMessage.id,
    chatId: validMessage.chatId,
    chatName: validMessage.chatName ?? null,
    chatNameIndex: validMessage.chatNameIndex ?? null,
    text: validMessage.text,
    senderJid: validMessage.senderJid,
    senderName: validMessage.senderName,
    senderNameIndex: validMessage.senderNameIndex ?? null,
    senderPhoneNumber: validMessage.senderPhoneNumber ?? null,
    senderPhoneNumberIndex: validMessage.senderPhoneNumberIndex ?? null,
    timestamp: new Date(validMessage.timestamp),
    isFromMe: validMessage.isFromMe,
    isGroupChat: validMessage.chatIsGroupChat,
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
  const insertedMessages: Array<{ id: string; messageId: string }> = []

  const totalBatches = Math.ceil(validMessages.length / BATCH_SIZE)
  for (let i = 0; i < validMessages.length; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const batch = validMessages.slice(i, i + BATCH_SIZE)
    const batchValues = batch.map((m) => toMessageValues(m, deviceId, syncTime))

    const result = await db
      .insert(WhatsappMessages)
      .values(batchValues)
      .onConflictDoNothing()
      .returning()

    insertedMessages.push(...result)
    console.info(
      `Batch ${batchNumber}/${totalBatches}: Inserted ${result.length} WhatsApp messages`
    )
  }

  return insertedMessages
}
