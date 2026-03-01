import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { paginationSchema, parseSearchParams } from "@/lib/validate-params"
import { and, desc, eq, gte, isNull, or } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"

const searchParamsSchema = z.object({
  ...paginationSchema,
}).strict()

type RouteParams = { params: Promise<{ chat_id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) {
    return auth.response
  }

  const { chat_id } = await params
  const chatId = decodeURIComponent(chat_id)

  const result = parseSearchParams(new URL(request.url).searchParams, searchParamsSchema)
  if (!result.ok) {
    return result.response
  }
  const { limit, offset } = result.params

  const cutoff = getDataWindowCutoff(auth.token)
  const messages = await getChatMessages(chatId, limit, offset, cutoff)

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

async function getChatMessages(
  chatId: string,
  limit: number,
  offset: number,
  cutoff: Date | null
) {
  // Chat ID can be either:
  // 1. A group chat ID (starts with "chat") - match on chat_id column
  // 2. A contact (phone/email) for 1:1 chats - match on contact where chat_id is null
  const isGroupChat = chatId.startsWith("chat")

  const conditions = [
    eq(iMessages.userId, DEFAULT_USER_ID),
    isGroupChat
      ? eq(iMessages.chatId, chatId)
      : or(
          and(eq(iMessages.contactIndex, chatId), isNull(iMessages.chatId)),
          eq(iMessages.chatId, chatId)
        ),
  ]
  if (cutoff) {
    conditions.push(gte(iMessages.date, cutoff))
  }

  const messages = await db.query.iMessages.findMany({
    where: and(...conditions),
    orderBy: [desc(iMessages.date)],
    limit,
    offset,
  })

  return messages
}
