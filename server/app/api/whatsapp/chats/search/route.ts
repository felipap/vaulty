import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { normalizePhoneForSearch } from "@/lib/search-normalize"
import { paginationSchema, parseSearchParams } from "@/lib/validate-params"
import { type SQL, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { type WhatsappChat, type WhatsappChatRow, parseChats } from "../../types"
import { z } from "zod"

const searchParamsSchema = z.object({
  ...paginationSchema,
  sender: z.string().default(""),
  senderPhoneNumberIndex: z.string().optional(),
}).strict()

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "whatsapp")
  if (!auth.authorized) {
    return auth.response
  }

  const result = parseSearchParams(new URL(request.url).searchParams, searchParamsSchema)
  if (!result.ok) {
    return result.response
  }
  const { limit, offset, sender, senderPhoneNumberIndex } = result.params

  const normalizedSender = normalizePhoneForSearch(sender).replace(/\D/g, "")

  if (normalizedSender.length === 0 && !senderPhoneNumberIndex) {
    return Response.json(
      { error: "sender or senderPhoneNumberIndex parameter is required" },
      { status: 400 }
    )
  }

  const startTime = Date.now()
  const cutoff = getDataWindowCutoff(auth.token)

  const senderFilter = senderPhoneNumberIndex
    ? sql`sender_phone_number_index = ${senderPhoneNumberIndex}`
    : sql`REPLACE(REPLACE(REPLACE(REPLACE(sender_jid, '@s.whatsapp.net', ''), '-', ''), ' ', ''), '+', '') LIKE '%' || ${normalizedSender} || '%'`

  const { chats, total } = await searchChats(senderFilter, limit, offset, cutoff)

  await logRead({
    type: "whatsapp",
    description: senderPhoneNumberIndex
      ? `Searched WhatsApp chats by phone index`
      : `Searched WhatsApp chats by sender: ${sender}`,
    count: chats.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    chats,
    count: chats.length,
    total,
    page: {
      limit,
      offset,
    },
    metadata: {
      elapsedMs: Date.now() - startTime,
      searchSender: sender || undefined,
      normalizedSender: normalizedSender || undefined,
      searchByIndex: !!senderPhoneNumberIndex,
    },
  })
}

async function searchChats(
  filterCondition: SQL,
  limit: number,
  offset: number,
  cutoff: Date | null
): Promise<{ chats: WhatsappChat[]; total: number }> {
  const tsFilter = cutoff ? sql`AND timestamp >= ${cutoff}` : sql``

  const countResult = await db.all<{ count: number }>(sql`
    SELECT COUNT(DISTINCT chat_id) as count
    FROM whatsapp_messages
    WHERE user_id = ${DEFAULT_USER_ID}
      AND ${filterCondition}
      ${tsFilter}
  `)

  const total = countResult[0]?.count ?? 0

  const result = await db.all<WhatsappChatRow>(sql`
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
    ),
    filtered_chats AS (
      SELECT DISTINCT chat_id
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND ${filterCondition}
        ${tsFilter}
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
    JOIN filtered_chats fc ON rm.chat_id = fc.chat_id
    WHERE rm.rn = 1
    ORDER BY rm.timestamp DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `)

  return { chats: parseChats(result), total }
}
