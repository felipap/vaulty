"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages, iMessageAttachments } from "@/db/schema"
import { desc, eq, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type SortBy = "syncTime" | "date"

export type Attachment = {
  id: string
  filename: string
  mimeType: string
  size: number | null
  isImage: boolean
  dataBase64: string | null
}

export type Message = {
  id: string
  guid: string
  text: string | null
  contact: string
  date: Date | null
  syncTime: Date
  isFromMe: boolean
  hasAttachments: boolean
  service: string
}

export type MessageWithAttachments = Message & {
  attachments: Attachment[]
}

export type MessagesPage = {
  messages: Message[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getMessage(id: string): Promise<MessageWithAttachments | null> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const message = await db.query.iMessages.findFirst({
    where: eq(iMessages.id, id),
    columns: {
      id: true,
      guid: true,
      text: true,
      contact: true,
      date: true,
      syncTime: true,
      isFromMe: true,
      hasAttachments: true,
      service: true,
    },
  })

  if (!message) {
    return null
  }

  const attachments = await db.query.iMessageAttachments.findMany({
    where: eq(iMessageAttachments.messageGuid, message.guid),
    columns: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      isImage: true,
      dataBase64: true,
    },
  })

  return {
    id: message.id,
    guid: message.guid,
    text: message.text,
    contact: message.contact,
    date: message.date,
    syncTime: message.syncTime,
    isFromMe: message.isFromMe === 1,
    hasAttachments: message.hasAttachments === 1,
    service: message.service,
    attachments: attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
      isImage: a.isImage === 1,
      dataBase64: a.dataBase64,
    })),
  }
}

export async function getMessages(
  page: number = 1,
  pageSize: number = 20,
  sortBy: SortBy = "syncTime"
): Promise<MessagesPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(iMessages)
    .where(eq(iMessages.userId, DEFAULT_USER_ID))

  const total = countResult.count

  const orderByColumn = sortBy === "syncTime" ? iMessages.syncTime : iMessages.date

  const messages = await db.query.iMessages.findMany({
    where: eq(iMessages.userId, DEFAULT_USER_ID),
    orderBy: desc(orderByColumn),
    limit: pageSize,
    offset,
    columns: {
      id: true,
      guid: true,
      text: true,
      contact: true,
      date: true,
      syncTime: true,
      isFromMe: true,
      hasAttachments: true,
      service: true,
    },
  })

  return {
    messages: messages.map((m) => ({
      id: m.id,
      guid: m.guid,
      text: m.text,
      contact: m.contact,
      date: m.date,
      syncTime: m.syncTime,
      isFromMe: m.isFromMe === 1,
      hasAttachments: m.hasAttachments === 1,
      service: m.service,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}


