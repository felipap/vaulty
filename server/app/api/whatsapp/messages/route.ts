import { db } from "@/db"
import { DEFAULT_USER_ID, WhatsappMessages } from "@/db/schema"
import { logRead, logWrite } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import {
  WHATSAPP_ENCRYPTED_COLUMNS,
  encryptedOrEmpty,
} from "@/lib/encryption-schema"
import { truncateForLog } from "@/lib/logger"
import { parsePagination } from "@/lib/pagination"
import { rejectUnknownParams } from "@/lib/validate-params"
import { and, eq, gte } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { SyncSuccessResponse, SyncErrorResponse, formatZodError, summarizeZodError } from "@/app/api/types"

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

const GET_ALLOWED_PARAMS = ["limit", "offset", "after", "chatId"]

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "whatsapp")
  if (!auth.authorized) {
    return auth.response
  }

  console.log("GET /api/whatsapp/messages")

  const { searchParams } = new URL(request.url)

  const unknownParamsError = rejectUnknownParams(searchParams, GET_ALLOWED_PARAMS)
  if (unknownParamsError) {
    return unknownParamsError
  }

  const pagination = parsePagination(searchParams)
  if (!pagination.ok) {
    return pagination.response
  }
  const { limit, offset } = pagination.params

  const afterParam = searchParams.get("after")
  const chatIdParam = searchParams.get("chatId")

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

  const cutoff = getDataWindowCutoff(auth.token)
  if (cutoff) {
    conditions.push(gte(WhatsappMessages.timestamp, cutoff))
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
    console.warn("Invalid request body:", summarizeZodError(parsed.error))
    return NextResponse.json<SyncErrorResponse>(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const { messages, syncTime, deviceId, messageCount } = parsed.data

  console.log(
    `Received ${messageCount} WhatsApp messages from device ${deviceId} at ${syncTime}`
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

  return NextResponse.json<SyncSuccessResponse>({
    success: true,
    insertedCount: insertedMessages.length,
    updatedCount: 0,
    rejectedCount: rejectedMessages.length,
    skippedCount,
  })
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
