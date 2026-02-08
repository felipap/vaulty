import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "whatsapp")
  if (!auth.authorized) { return auth.response }

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

  const startTime = Date.now()

  const { chats } = await getLatestChats(limit, offset)

  await logRead({
    type: "whatsapp",
    description: "Fetched WhatsApp chat list",
    count: chats.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    chats,
    count: chats.length,
    page: {
      limit,
      offset,
    },
    metadata: {
      elapsedMs: Date.now() - startTime,
    },
  })
}

interface Chat {
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

async function getLatestChats(
  limit: number,
  offset: number
): Promise<{ chats: Chat[] }> {
  const result = await db.execute<{
    chat_id: string
    chat_name: string | null
    text: string | null
    timestamp: Date | null
    is_from_me: boolean
    participant_count: number
    is_group_chat: boolean
    participants: string[]
    message_count: number
  }>(sql`
    WITH ranked_messages AS (
      SELECT
        chat_id,
        chat_name,
        text,
        timestamp,
        is_from_me,
        sender_jid,
        ROW_NUMBER() OVER (
          PARTITION BY chat_id
          ORDER BY timestamp DESC NULLS LAST
        ) as rn
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
    ),
    chat_participants AS (
      SELECT
        chat_id,
        COUNT(DISTINCT sender_jid) as participant_count,
        COUNT(*) as message_count,
        BOOL_OR(is_group_chat) as is_group_chat,
        ARRAY_AGG(DISTINCT sender_jid) as participants
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
      GROUP BY chat_id
    )
    SELECT
      rm.chat_id,
      rm.chat_name,
      rm.text,
      rm.timestamp,
      rm.is_from_me,
      cp.participant_count,
      cp.is_group_chat,
      cp.participants,
      cp.message_count
    FROM ranked_messages rm
    JOIN chat_participants cp ON rm.chat_id = cp.chat_id
    WHERE rm.rn = 1
    ORDER BY rm.timestamp DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `)

  const chats: Chat[] = [...result].map((row) => ({
    chatId: row.chat_id,
    chatName: row.chat_name,
    isGroupChat: row.is_group_chat,
    lastMessageText: row.text,
    lastMessageDate: row.timestamp,
    lastMessageFromMe: row.is_from_me,
    participantCount: Number(row.participant_count),
    participants: row.participants,
    messageCount: Number(row.message_count),
  }))

  return { chats }
}
