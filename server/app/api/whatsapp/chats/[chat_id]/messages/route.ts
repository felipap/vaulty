import { db } from "@/db"
import { DEFAULT_USER_ID, WhatsappMessages } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { and, desc, eq, gte } from "drizzle-orm"
import { NextRequest } from "next/server"

type RouteParams = { params: Promise<{ chat_id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireReadAuth(request, "whatsapp")
  if (!auth.authorized) {
    return auth.response
  }

  const { chat_id } = await params
  const chatId = decodeURIComponent(chat_id)

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit") || "20"
  const offsetParam = searchParams.get("offset")

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

  const cutoff = getDataWindowCutoff(auth.token)
  const messages = await getChatMessages(chatId, limit, offset, cutoff)

  await logRead({
    type: "whatsapp",
    description: `Fetched WhatsApp messages for chat ${chatId}`,
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
  const conditions = [
    eq(WhatsappMessages.userId, DEFAULT_USER_ID),
    eq(WhatsappMessages.chatId, chatId),
  ]
  if (cutoff) {
    conditions.push(gte(WhatsappMessages.timestamp, cutoff))
  }

  const messages = await db.query.WhatsappMessages.findMany({
    where: and(...conditions),
    orderBy: [desc(WhatsappMessages.timestamp)],
    limit,
    offset,
  })

  return messages
}
