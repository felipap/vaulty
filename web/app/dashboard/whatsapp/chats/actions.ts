"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { normalizePhoneForSearch } from "@/lib/search-normalize"
import { sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type WhatsappChat = {
  chatId: string
  chatName: string | null
  lastMessageText: string | null
  lastMessageDate: Date | null
  lastMessageFromMe: boolean
  participantCount: number
  participants: string[]
  messageCount: number
}

export type WhatsappChatsPage = {
  chats: WhatsappChat[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getWhatsappChats(
  page: number = 1,
  pageSize: number = 20,
  search: string = ""
): Promise<WhatsappChatsPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize
  // Use same normalization as desktop when building phone index (see lib/search-normalize.ts)
  const normalizedSearch = normalizePhoneForSearch(search).replace(/\D/g, "")
  const hasSearch = normalizedSearch.length > 0

  const [countResult] = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT chat_id)::int as count
    FROM whatsapp_messages
    WHERE user_id = ${DEFAULT_USER_ID}
      ${hasSearch ? sql`AND REGEXP_REPLACE(sender, '[^0-9]', '', 'g') LIKE '%' || ${normalizedSearch} || '%'` : sql``}
  `)

  const total = countResult.count

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
    WITH ranked_messages AS (
      SELECT
        chat_id,
        chat_name,
        id,
        text,
        timestamp,
        is_from_me,
        sender,
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
        COUNT(DISTINCT sender) as participant_count,
        COUNT(*) as message_count,
        ARRAY_AGG(DISTINCT sender) as participants
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
      GROUP BY chat_id
    ),
    filtered_chats AS (
      SELECT DISTINCT chat_id
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        ${hasSearch ? sql`AND REGEXP_REPLACE(sender, '[^0-9]', '', 'g') LIKE '%' || ${normalizedSearch} || '%'` : sql``}
    )
    SELECT
      rm.chat_id,
      rm.chat_name,
      rm.text,
      rm.timestamp,
      rm.is_from_me,
      cp.participant_count,
      cp.participants,
      cp.message_count
    FROM ranked_messages rm
    JOIN chat_participants cp ON rm.chat_id = cp.chat_id
    ${hasSearch ? sql`JOIN filtered_chats fc ON rm.chat_id = fc.chat_id` : sql``}
    WHERE rm.rn = 1
    ORDER BY rm.timestamp DESC NULLS LAST
    LIMIT ${pageSize}
    OFFSET ${offset}
  `)

  return {
    chats: [...result].map((row) => ({
      chatId: row.chat_id,
      chatName: row.chat_name,
      lastMessageText: row.text,
      lastMessageDate: row.timestamp,
      lastMessageFromMe: row.is_from_me === 1,
      participantCount: Number(row.participant_count),
      participants: row.participants,
      messageCount: Number(row.message_count),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export type WhatsappChatMessage = {
  id: string
  text: string | null
  sender: string
  senderName: string | null
  timestamp: Date
  isFromMe: boolean
}

export type WhatsappChatWithMessages = WhatsappChat & {
  messages: WhatsappChatMessage[]
}

export type WhatsappMessagesPage = {
  messages: WhatsappChatMessage[]
  hasMore: boolean
}

export async function getWhatsappChatWithMessages(
  chatId: string,
  limit: number = 50
): Promise<WhatsappChatWithMessages | null> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  // First get the chat info
  const chatResult = await db.execute<{
    chat_id: string
    chat_name: string | null
    text: string | null
    timestamp: Date | null
    is_from_me: number
    participant_count: number
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
        COUNT(DISTINCT sender) as participant_count,
        COUNT(*) as message_count,
        ARRAY_AGG(DISTINCT sender) as participants
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
      cp.participants,
      cp.message_count
    FROM ranked_messages rm
    JOIN chat_participants cp ON rm.chat_id = cp.chat_id
    WHERE rm.rn = 1
      AND rm.chat_id = ${chatId}
    LIMIT 1
  `)

  const chatRow = [...chatResult][0]
  if (!chatRow) {
    return null
  }

  // Get messages for this chat
  const messagesResult = await db.execute<{
    id: string
    text: string | null
    sender: string
    sender_name: string | null
    timestamp: Date
    is_from_me: number
  }>(sql`
    SELECT
      id,
      text,
      sender,
      sender_name,
      timestamp,
      is_from_me
    FROM whatsapp_messages
    WHERE user_id = ${DEFAULT_USER_ID}
      AND chat_id = ${chatId}
    ORDER BY timestamp DESC NULLS LAST
    LIMIT ${limit}
  `)

  return {
    chatId: chatRow.chat_id,
    chatName: chatRow.chat_name,
    lastMessageText: chatRow.text,
    lastMessageDate: chatRow.timestamp,
    lastMessageFromMe: chatRow.is_from_me === 1,
    participantCount: Number(chatRow.participant_count),
    participants: chatRow.participants,
    messageCount: Number(chatRow.message_count),
    messages: [...messagesResult].map((m) => ({
      id: m.id,
      text: m.text,
      sender: m.sender,
      senderName: m.sender_name,
      timestamp: m.timestamp,
      isFromMe: m.is_from_me === 1,
    })),
  }
}

export async function getWhatsappChatMessages(
  chatId: string,
  offset: number = 0,
  limit: number = 50
): Promise<WhatsappMessagesPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  // Get total count for this chat
  const [countResult] = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int as count
    FROM whatsapp_messages
    WHERE user_id = ${DEFAULT_USER_ID}
      AND chat_id = ${chatId}
  `)

  const total = countResult.count

  const messagesResult = await db.execute<{
    id: string
    text: string | null
    sender: string
    sender_name: string | null
    timestamp: Date
    is_from_me: number
  }>(sql`
    SELECT
      id,
      text,
      sender,
      sender_name,
      timestamp,
      is_from_me
    FROM whatsapp_messages
    WHERE user_id = ${DEFAULT_USER_ID}
      AND chat_id = ${chatId}
    ORDER BY timestamp DESC NULLS LAST
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  const messages = [...messagesResult].map((m) => ({
    id: m.id,
    text: m.text,
    sender: m.sender,
    senderName: m.sender_name,
    timestamp: m.timestamp,
    isFromMe: m.is_from_me === 1,
  }))

  return {
    messages,
    hasMore: offset + messages.length < total,
  }
}
