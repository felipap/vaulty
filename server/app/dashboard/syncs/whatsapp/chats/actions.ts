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
  isGroupChat: boolean
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

export type ChatSearchParams = {
  senderJid?: string
  chatId?: string
  phoneIndex?: string
  senderNameIndex?: string
  chatNameIndex?: string
}

export async function getWhatsappChats(
  page: number = 1,
  pageSize: number = 20,
  searchParams: ChatSearchParams = {}
): Promise<WhatsappChatsPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const { senderJid, chatId, phoneIndex, senderNameIndex, chatNameIndex } =
    searchParams
  const normalizedJid = senderJid
    ? normalizePhoneForSearch(senderJid).replace(/\D/g, "")
    : ""
  const hasJidSearch = normalizedJid.length > 0
  const hasChatIdSearch = !!chatId
  const hasPhoneSearch = !!phoneIndex
  const hasSenderNameSearch = !!senderNameIndex
  const hasChatNameSearch = !!chatNameIndex
  const hasAnySearch =
    hasJidSearch ||
    hasChatIdSearch ||
    hasPhoneSearch ||
    hasSenderNameSearch ||
    hasChatNameSearch

  const filterClauses = sql`
    ${hasJidSearch ? sql`AND REPLACE(REPLACE(REPLACE(REPLACE(sender_jid, '@s.whatsapp.net', ''), '-', ''), ' ', ''), '+', '') LIKE '%' || ${normalizedJid} || '%'` : sql``}
    ${hasChatIdSearch ? sql`AND chat_id = ${chatId}` : sql``}
    ${hasPhoneSearch ? sql`AND sender_phone_number_index = ${phoneIndex}` : sql``}
    ${hasSenderNameSearch ? sql`AND sender_name_index = ${senderNameIndex}` : sql``}
    ${hasChatNameSearch ? sql`AND chat_name_index = ${chatNameIndex}` : sql``}
  `

  const countResult = await db.all<{ count: number }>(sql`
    SELECT COUNT(DISTINCT chat_id) as count
    FROM whatsapp_messages
    WHERE user_id = ${DEFAULT_USER_ID}
      ${filterClauses}
  `)

  const total = countResult[0]?.count ?? 0

  const result = await db.all<{
    chat_id: string
    chat_name: string | null
    text: string | null
    timestamp: number | null
    is_from_me: number
    participant_count: number
    is_group_chat: number
    participants: string
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
        sender_jid,
        ROW_NUMBER() OVER (
          PARTITION BY chat_id
          ORDER BY timestamp DESC NULLS LAST
        ) as rn
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        AND text IS NOT NULL AND text != ''
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
      GROUP BY chat_id
    ),
    filtered_chats AS (
      SELECT DISTINCT chat_id
      FROM whatsapp_messages
      WHERE user_id = ${DEFAULT_USER_ID}
        ${filterClauses}
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
    ${hasAnySearch ? sql`JOIN filtered_chats fc ON rm.chat_id = fc.chat_id` : sql``}
    WHERE rm.rn = 1
    ORDER BY rm.timestamp DESC NULLS LAST
    LIMIT ${pageSize}
    OFFSET ${offset}
  `)

  return {
    chats: result.map((row) => ({
      chatId: row.chat_id,
      chatName: row.chat_name,
      lastMessageText: row.text,
      lastMessageDate: row.timestamp ? new Date(row.timestamp) : null,
      lastMessageFromMe: Boolean(row.is_from_me),
      isGroupChat: Boolean(row.is_group_chat),
      participantCount: Number(row.participant_count),
      participants: JSON.parse(row.participants) as string[],
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
  senderJid: string | null
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

  const chatResult = await db.all<{
    chat_id: string
    chat_name: string | null
    text: string | null
    timestamp: number | null
    is_from_me: number
    participant_count: number
    is_group_chat: number
    participants: string
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
        AND text IS NOT NULL AND text != ''
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
      AND rm.chat_id = ${chatId}
    LIMIT 1
  `)

  const chatRow = chatResult[0]
  if (!chatRow) {
    return null
  }

  const messagesResult = await db.all<{
    id: string
    text: string | null
    sender_jid: string | null
    sender_name: string | null
    timestamp: number
    is_from_me: number
  }>(sql`
    SELECT
      id,
      text,
      sender_jid,
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
    isGroupChat: Boolean(chatRow.is_group_chat),
    lastMessageText: chatRow.text,
    lastMessageDate: chatRow.timestamp ? new Date(chatRow.timestamp) : null,
    lastMessageFromMe: Boolean(chatRow.is_from_me),
    participantCount: Number(chatRow.participant_count),
    participants: JSON.parse(chatRow.participants) as string[],
    messageCount: Number(chatRow.message_count),
    messages: messagesResult.map((m) => ({
      id: m.id,
      text: m.text,
      senderJid: m.sender_jid,
      senderName: m.sender_name,
      timestamp: new Date(m.timestamp),
      isFromMe: Boolean(m.is_from_me),
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

  const countResult = await db.all<{ count: number }>(sql`
    SELECT COUNT(*) as count
    FROM whatsapp_messages
    WHERE user_id = ${DEFAULT_USER_ID}
      AND chat_id = ${chatId}
  `)

  const total = countResult[0]?.count ?? 0

  const messagesResult = await db.all<{
    id: string
    text: string | null
    sender_jid: string | null
    sender_name: string | null
    timestamp: number
    is_from_me: number
  }>(sql`
    SELECT
      id,
      text,
      sender_jid,
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

  const messages = messagesResult.map((m) => ({
    id: m.id,
    text: m.text,
    senderJid: m.sender_jid,
    senderName: m.sender_name,
    timestamp: new Date(m.timestamp),
    isFromMe: Boolean(m.is_from_me),
  }))

  return {
    messages,
    hasMore: offset + messages.length < total,
  }
}
