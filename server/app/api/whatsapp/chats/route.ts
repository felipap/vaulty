import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { parsePagination } from "@/lib/pagination"
import { sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { parseChats, WhatsappChat, WhatsappChatRow } from "../types"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "whatsapp")
  if (!auth.authorized) {
    return auth.response
  }

  const { searchParams } = new URL(request.url)
  const pagination = parsePagination(searchParams)
  if (!pagination.ok) {
    return pagination.response
  }
  const { limit, offset } = pagination.params

  const startTime = Date.now()

  const cutoff = getDataWindowCutoff(auth.token)
  const { chats } = await getLatestChats(limit, offset, cutoff)

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

async function getLatestChats(
  limit: number,
  offset: number,
  cutoff: Date | null
): Promise<{ chats: WhatsappChat[] }> {
  const tsFilter = cutoff ? sql`AND timestamp >= ${cutoff}` : sql``

  const result = await db.all<WhatsappChatRow>(sql`
    WITH ranked_messages AS (
      SELECT
        chat_id,
        chat_name,
        text,
        timestamp,
        is_from_me,
        sender_jid,
        sender_name,
        ROW_NUMBER() OVER (
          PARTITION BY chat_id
          ORDER BY timestamp DESC NULLS LAST
        ) as rn
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND text IS NOT NULL AND text != ''
        ${tsFilter}
    ),
    chat_participants AS (
      SELECT
        chat_id,
        COUNT(DISTINCT sender_jid) as participant_count,
        COUNT(*) as message_count,
        MAX(is_group_chat) as is_group_chat,
        json_group_array(DISTINCT sender_jid) as participants
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        ${tsFilter}
      GROUP BY chat_id
    )
    SELECT
      rm.chat_id,
      rm.chat_name,
      rm.text,
      rm.timestamp,
      rm.is_from_me,
      rm.sender_jid,
      rm.sender_name,
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

  return { chats: parseChats(result) }
}
