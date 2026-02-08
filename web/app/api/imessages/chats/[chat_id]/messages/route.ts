import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"
import { and, desc, eq, isNull, or } from "drizzle-orm"
import { NextRequest } from "next/server"

type RouteParams = { params: Promise<{ chat_id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) { return auth.response }

  const { chat_id } = await params
  const chatId = decodeURIComponent(chat_id)

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit") || "20"
  const offsetParam = searchParams.get("offset")

  // if (!limitParam) {
  //   return Response.json(
  //     { error: "limit query parameter is required" },
  //     { status: 400 }
  //   )
  // }

  const limit = parseInt(limitParam, 10)
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  const MAX_LIMIT = 50

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

  const messages = await getChatMessages(chatId, limit, offset)

  await logRead({
    type: "imessage",
    description: `Fetched messages for chat ${chatId}`,
    count: messages.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    chatId,
    messages,
    count: messages.length,
    page: {
      limit,
      offset,
    },
  })
}

async function getChatMessages(chatId: string, limit: number, offset: number) {
  // Chat ID can be either:
  // 1. A group chat ID (starts with "chat") - match on chat_id column
  // 2. A contact (phone/email) for 1:1 chats - match on contact where chat_id is null
  const isGroupChat = chatId.startsWith("chat")

  const messages = await db.query.iMessages.findMany({
    where: and(
      eq(iMessages.userId, DEFAULT_USER_ID),
      isGroupChat
        ? eq(iMessages.chatId, chatId)
        : or(
            // Direct 1:1 conversation (no chat_id)
            and(eq(iMessages.contact, chatId), isNull(iMessages.chatId)),
            // Or group chat that happens to match this contact as chat_id
            eq(iMessages.chatId, chatId)
          )
    ),
    orderBy: [desc(iMessages.date)],
    limit,
    offset,
  })

  return messages
}
