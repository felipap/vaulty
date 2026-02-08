import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"
import { sql } from "drizzle-orm"
import { NextRequest } from "next/server"

type RouteParams = { params: Promise<{ chat_id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) { return auth.response }

  const { chat_id } = await params
  const chatId = decodeURIComponent(chat_id)

  const chat = await getChatDetails(chatId)

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

async function getChatDetails(chatId: string): Promise<ChatDetails | null> {
  const isGroup = isGroupChat(chatId)

  const result = await db.execute<{
    chat_id: string
    text: string | null
    date: Date | null
    is_read: boolean
    is_from_me: boolean
    participant_count: number
    participants: string[]
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
          ${isGroup ? sql`chat_id = ${chatId}` : sql`(chat_id = ${chatId} OR (contact = ${chatId} AND chat_id IS NULL))`}
        )
    ),
    chat_stats AS (
      SELECT
        COUNT(DISTINCT contact) as participant_count,
        COUNT(*) as message_count,
        ARRAY_AGG(DISTINCT contact) as participants
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND (
          ${isGroup ? sql`chat_id = ${chatId}` : sql`(chat_id = ${chatId} OR (contact = ${chatId} AND chat_id IS NULL))`}
        )
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

  const row = [...result][0]
  if (!row) {
    return null
  }

  return {
    chatId: row.chat_id,
    isGroupChat: isGroup,
    lastMessageText: row.text,
    lastMessageDate: row.date,
    lastMessageRead: row.is_read,
    lastMessageFromMe: row.is_from_me,
    participantCount: Number(row.participant_count),
    participants: row.participants,
    messageCount: Number(row.message_count),
  }
}
