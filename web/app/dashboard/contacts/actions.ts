"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { DEFAULT_USER_ID } from "@/db/schema"
import { sql } from "drizzle-orm"

export type Contact = {
  contact: string
  messageCount: number
  lastMessageDate: Date | null
  lastMessageText: string | null
  lastMessageFromMe: boolean
}

export type ContactsPage = {
  contacts: Contact[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getContacts(
  page: number = 1,
  pageSize: number = 20
): Promise<ContactsPage> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized")
  }

  const offset = (page - 1) * pageSize

  const [countResult] = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT contact)::int as count
    FROM imessages
    WHERE user_id = ${DEFAULT_USER_ID}
  `)

  const total = countResult.count

  const result = await db.execute<{
    contact: string
    message_count: number
    last_message_date: Date | null
    last_message_text: string | null
    last_message_from_me: number
  }>(sql`
    WITH ranked_messages AS (
      SELECT
        contact,
        text,
        date,
        is_from_me,
        ROW_NUMBER() OVER (
          PARTITION BY contact
          ORDER BY date DESC NULLS LAST
        ) as rn
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
    ),
    contact_stats AS (
      SELECT
        contact,
        COUNT(*) as message_count
      FROM imessages
      WHERE user_id = ${DEFAULT_USER_ID}
      GROUP BY contact
    )
    SELECT
      cs.contact,
      cs.message_count,
      rm.date as last_message_date,
      rm.text as last_message_text,
      rm.is_from_me as last_message_from_me
    FROM contact_stats cs
    LEFT JOIN ranked_messages rm ON cs.contact = rm.contact AND rm.rn = 1
    ORDER BY rm.date DESC NULLS LAST
    LIMIT ${pageSize}
    OFFSET ${offset}
  `)

  const contacts = [...result].map((row) => ({
    contact: row.contact,
    messageCount: Number(row.message_count),
    lastMessageDate: row.last_message_date,
    lastMessageText: row.last_message_text,
    lastMessageFromMe: row.last_message_from_me === 1,
  }))

  return {
    contacts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
