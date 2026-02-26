import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { parsePagination } from "@/lib/pagination"
import { rejectUnknownParams } from "@/lib/validate-params"

const ALLOWED_PARAMS = ["limit", "offset"]

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) {
    return auth.response
  }

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

  const startTime = Date.now()

  const cutoff = getDataWindowCutoff(auth.token)
  const { chats } = await getLatestChats(limit, offset, cutoff)

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
  return chatId.startsWith("chat")
}

async function getLatestChats(
  limit: number,
  offset: number,
  cutoff: Date | null
): Promise<{ chats: Chat[] }> {
  const dateFilter = cutoff
    ? sql`AND date >= ${cutoff}`
    : sql``

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
    WITH ranked_messages AS (
      SELECT
        COALESCE(chat_id, contact_index) as effective_chat_id,
        id,
        text,
        date,
        is_read,
        is_from_me,
        contact,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(chat_id, contact_index)
          ORDER BY date DESC NULLS LAST
        ) as rn
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND text IS NOT NULL
        ${dateFilter}
    ),
    chat_participants AS (
      SELECT
        COALESCE(chat_id, contact_index) as effective_chat_id,
        COUNT(DISTINCT contact_index) as participant_count,
        COUNT(*) as message_count,
        json_group_array(DISTINCT contact) as participants
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
        ${dateFilter}
      GROUP BY COALESCE(chat_id, contact_index)
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

  const chats: Chat[] = result.map((row) => ({
    chatId: row.chat_id,
    isGroupChat: isGroupChat(row.chat_id),
    lastMessageText: row.text,
    lastMessageDate: row.date ? new Date(row.date) : null,
    lastMessageRead: Boolean(row.is_read),
    lastMessageFromMe: Boolean(row.is_from_me),
    participantCount: Number(row.participant_count),
    participants: JSON.parse(row.participants) as string[],
    messageCount: Number(row.message_count),
  }))

  return { chats }
}
