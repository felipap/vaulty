import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { sql } from "drizzle-orm"
import { NextRequest } from "next/server"

type RouteParams = { params: Promise<{ chat_id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) {
    return auth.response
  }

  const { chat_id } = await params
  const chatId = decodeURIComponent(chat_id)

  const cutoff = getDataWindowCutoff(auth.token)
  const chat = await getChatDetails(chatId, cutoff)

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 })
  }

  await logRead({
    type: "chat",
    description: `Fetched chat details for ${chatId}`,
    count: 1,
    token: auth.token,
  })

  return Response.json({
    success: true,
    chat,
  })
}

interface ChatDetails {
  chatId: string
  isGroupChat: boolean
  lastMessageText: string | null
  lastMessageDate: Date | null
  lastMessageRead: boolean
  lastMessageFromMe: boolean
  participantCount: number
  participants: string[]
  messageCount: number
}

function isGroupChat(chatId: string): boolean {
  return chatId.startsWith("chat")
}

async function getChatDetails(
  chatId: string,
  cutoff: Date | null
): Promise<ChatDetails | null> {
  const isGroup = isGroupChat(chatId)
  const dateFilter = cutoff ? sql`AND date >= ${cutoff}` : sql``

  const result = await db.all<{
    chat_id: string
    text: string | null
    date: number | null
    is_read: number
    is_from_me: number
    participant_count: number
    participants: string
    message_count: number
  }>(sql`
    WITH chat_messages AS (
      SELECT
        id,
        text,
        date,
        is_read,
        is_from_me,
        contact,
        ROW_NUMBER() OVER (ORDER BY date DESC NULLS LAST) as rn
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND (
          ${isGroup ? sql`chat_id = ${chatId}` : sql`(chat_id = ${chatId} OR (contact_index = ${chatId} AND chat_id IS NULL))`}
        )
        ${dateFilter}
    ),
    chat_stats AS (
      SELECT
        COUNT(DISTINCT contact_index) as participant_count,
        COUNT(*) as message_count,
        json_group_array(DISTINCT contact) as participants
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND (
          ${isGroup ? sql`chat_id = ${chatId}` : sql`(chat_id = ${chatId} OR (contact_index = ${chatId} AND chat_id IS NULL))`}
        )
        ${dateFilter}
    )
    SELECT
      ${chatId} as chat_id,
      cm.text,
      cm.date,
      cm.is_read,
      cm.is_from_me,
      cs.participant_count,
      cs.participants,
      cs.message_count
    FROM chat_messages cm
    CROSS JOIN chat_stats cs
    WHERE cm.rn = 1
  `)

  const row = result[0]
  if (!row) {
    return null
  }

  return {
    chatId: row.chat_id,
    isGroupChat: isGroup,
    lastMessageText: row.text,
    lastMessageDate: row.date ? new Date(row.date) : null,
    lastMessageRead: Boolean(row.is_read),
    lastMessageFromMe: Boolean(row.is_from_me),
    participantCount: Number(row.participant_count),
    participants: JSON.parse(row.participants) as string[],
    messageCount: Number(row.message_count),
  }
}
