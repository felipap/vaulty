import { db } from "@/db"
import { DEFAULT_USER_ID, WhatsappMessages } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { parsePagination } from "@/lib/pagination"
import { rejectUnknownParams } from "@/lib/validate-params"
import { and, desc, eq, gte } from "drizzle-orm"
import { NextRequest } from "next/server"

const ALLOWED_PARAMS = ["limit", "offset"]

type RouteParams = { params: Promise<{ chat_id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireReadAuth(request, "whatsapp")
  if (!auth.authorized) {
    return auth.response
  }

  const { chat_id } = await params
  const chatId = decodeURIComponent(chat_id)

  const { searchParams } = new URL(request.url)

  const unknownParamsError = rejectUnknownParams(searchParams, ALLOWED_PARAMS)
  if (unknownParamsError) {
    return unknownParamsError
  }

  const pagination = parsePagination(searchParams)
  if (!pagination.ok) {
    return pagination.response
  }
  const { limit, offset } = pagination.params

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
