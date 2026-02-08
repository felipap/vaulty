import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) { return auth.response }

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

  const startTime = Date.now()

  const { chats } = await getLatestChats(limit, offset)

  await logRead({
    type: "chat",
    description: "Fetched chat list",
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
  // Group chats typically start with "chat" followed by numbers
  return chatId.startsWith("chat")
}

async function getLatestChats(
  limit: number,
  offset: number
): Promise<{ chats: Chat[] }> {
  // Use a single SQL query with window functions to:
  // 1. Get the latest message per chat (using ROW_NUMBER)
  // 2. Count distinct participants per chat
  // 3. Aggregate participant list
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
    WITH ranked_messages AS (
      SELECT
        COALESCE(chat_id, contact) as effective_chat_id,
        id,
        text,
        date,
        is_read,
        is_from_me,
        contact,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(chat_id, contact)
          ORDER BY date DESC NULLS LAST
        ) as rn
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND text IS NOT NULL
    ),
    chat_participants AS (
      SELECT
        COALESCE(chat_id, contact) as effective_chat_id,
        COUNT(DISTINCT contact) as participant_count,
        COUNT(*) as message_count,
        ARRAY_AGG(DISTINCT contact) as participants
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
      GROUP BY COALESCE(chat_id, contact)
    )
    SELECT
      rm.effective_chat_id as chat_id,
      rm.text,
      rm.date,
      rm.is_read,
      rm.is_from_me,
      cp.participant_count,
      cp.participants,
      cp.message_count
    FROM ranked_messages rm
    JOIN chat_participants cp ON rm.effective_chat_id = cp.effective_chat_id
    WHERE rm.rn = 1
    ORDER BY rm.date DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `)

  const chats: Chat[] = [...result].map((row) => ({
    chatId: row.chat_id,
    isGroupChat: isGroupChat(row.chat_id),
    lastMessageText: row.text,
    lastMessageDate: row.date,
    lastMessageRead: row.is_read,
    lastMessageFromMe: row.is_from_me,
    participantCount: Number(row.participant_count),
    participants: row.participants,
    messageCount: Number(row.message_count),
  }))

  return { chats }
}
