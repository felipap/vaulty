import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { sql } from "drizzle-orm"
import { NextRequest } from "next/server"

type RouteParams = { params: Promise<{ chat_id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { chat_id } = await params
  const chatId = decodeURIComponent(chat_id)

  const chat = await getChatDetails(chatId)

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 })
  }

  await logRead({
    type: "whatsapp",
    description: `Fetched WhatsApp chat details for ${chatId}`,
    count: 1,
  })

  return Response.json({
    success: true,
    chat,
  })
}

interface ChatDetails {
  chatId: string
  chatName: string | null
  isGroupChat: boolean
  lastMessageText: string | null
  lastMessageDate: Date | null
  lastMessageFromMe: boolean
  participantCount: number
  participants: string[]
  messageCount: number
}

async function getChatDetails(chatId: string): Promise<ChatDetails | null> {
  const result = await db.execute<{
    chat_id: string
    chat_name: string | null
    text: string | null
    timestamp: Date | null
    is_from_me: number
    participant_count: number
    participants: string[]
    message_count: number
  }>(sql`
    WITH chat_messages AS (
      SELECT
        chat_name,
        text,
        timestamp,
        is_from_me,
        sender,
        ROW_NUMBER() OVER (ORDER BY timestamp DESC NULLS LAST) as rn
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND chat_id = ${chatId}
    ),
    chat_stats AS (
      SELECT
        COUNT(DISTINCT sender) as participant_count,
        COUNT(*) as message_count,
        ARRAY_AGG(DISTINCT sender) as participants
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND chat_id = ${chatId}
    )
    SELECT
      ${chatId} as chat_id,
      cm.chat_name,
      cm.text,
      cm.timestamp,
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
    chatName: row.chat_name,
    isGroupChat: Number(row.participant_count) > 2,
    lastMessageText: row.text,
    lastMessageDate: row.timestamp,
    lastMessageFromMe: row.is_from_me === 1,
    participantCount: Number(row.participant_count),
    participants: row.participants,
    messageCount: Number(row.message_count),
  }
}
