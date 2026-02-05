import Database from 'better-sqlite3'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { z } from 'zod'
import { WhatsappSqliteChat, WhatsappSqliteMessage } from './types'

// Core Data epoch offset (Jan 1, 2001 00:00:00 UTC in Unix time)
const CORE_DATA_EPOCH_OFFSET = 978307200

export function getWhatsAppDatabasePath(): string {
  return join(
    homedir(),
    'Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite',
  )
}

export function getWhatsAppContactsDbPath(): string {
  return join(
    homedir(),
    'Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ContactsV2.sqlite',
  )
}

function coreDataToDate(timestamp: number): Date {
  return new Date((timestamp + CORE_DATA_EPOCH_OFFSET) * 1000)
}

// Zod schemas for database rows
const ChatRowSchema = z.object({
  id: z.number(),
  jid: z.string(),
  name: z.string().nullable(),
  lastMessageDate: z.number().nullable(),
  unreadCount: z.number().nullable(),
  sessionType: z.number(),
})

const MessageRowSchema = z.object({
  id: z.number(),
  chatSessionId: z.number(),
  chatJid: z.string().nullable(),
  chatName: z.string().nullable(),
  text: z.string().nullable(),
  fromJid: z.string().nullable(),
  groupMemberJid: z.string().nullable(),
  groupMemberName: z.string().nullable(),
  messageDate: z.number(),
  isFromMe: z.number(),
  messageType: z.number(),
  mediaItemId: z.number().nullable(),
  mediaLocalPath: z.string().nullable(),
})

const ContactRowSchema = z.object({
  ZLID: z.string().nullable(),
  ZWHATSAPPID: z.string().nullable(),
  ZPHONENUMBER: z.string(),
})

const CountRowSchema = z.object({
  count: z.number(),
})

// Build a mapping of LID/JID to phone number from the contacts database
function buildContactPhoneMap(): Map<string, string> {
  const phoneMap = new Map<string, string>()
  const contactsDbPath = getWhatsAppContactsDbPath()

  if (!existsSync(contactsDbPath)) {
    return phoneMap
  }

  const contactsDb = new Database(contactsDbPath, { readonly: true })
  const rawRows = contactsDb
    .prepare(
      `SELECT ZLID, ZWHATSAPPID, ZPHONENUMBER 
       FROM ZWAADDRESSBOOKCONTACT 
       WHERE ZPHONENUMBER IS NOT NULL AND ZPHONENUMBER != ''`,
    )
    .all()

  const rows = z.array(ContactRowSchema).parse(rawRows)

  for (const row of rows) {
    // Map by LID (e.g., "70089604899045@lid" -> "+5521985351995")
    if (row.ZLID) {
      phoneMap.set(row.ZLID, row.ZPHONENUMBER)
    }
    // Map by WhatsApp JID (e.g., "5521985351995@s.whatsapp.net" -> "+5521985351995")
    if (row.ZWHATSAPPID) {
      phoneMap.set(row.ZWHATSAPPID, row.ZPHONENUMBER)
    }
  }

  contactsDb.close()
  return phoneMap
}

export function fetchChats(db: Database.Database): WhatsappSqliteChat[] {
  const rawRows = db
    .prepare(
      `
    SELECT
      Z_PK as id,
      ZCONTACTJID as jid,
      ZPARTNERNAME as name,
      ZLASTMESSAGEDATE as lastMessageDate,
      ZUNREADCOUNT as unreadCount,
      ZSESSIONTYPE as sessionType
    FROM ZWACHATSESSION
    WHERE ZREMOVED = 0 OR ZREMOVED IS NULL
    ORDER BY ZLASTMESSAGEDATE DESC
  `,
    )
    .all()

  const rows = z.array(ChatRowSchema).parse(rawRows)

  return rows.map((row) => ({
    id: String(row.id),
    jid: row.jid,
    name: row.name,
    lastMessageDate: row.lastMessageDate
      ? coreDataToDate(row.lastMessageDate).toISOString()
      : null,
    unreadCount: row.unreadCount ?? 0,
    isGroup: row.jid?.endsWith('@g.us') ?? false,
  }))
}

export function fetchMessages(
  db: Database.Database,
  since: Date,
): WhatsappSqliteMessage[] {
  // Convert JS Date to Core Data timestamp
  const sinceTimestamp =
    Math.floor(since.getTime() / 1000) - CORE_DATA_EPOCH_OFFSET

  // Build phone number lookup map from contacts database
  // Phone numbers are only available for contacts saved in the user's address book
  const phoneMap = buildContactPhoneMap()

  const rawRows = db
    .prepare(
      `
    SELECT
      m.Z_PK as id,
      m.ZCHATSESSION as chatSessionId,
      c.ZCONTACTJID as chatJid,
      c.ZPARTNERNAME as chatName,
      m.ZTEXT as text,
      m.ZFROMJID as fromJid,
      gm.ZMEMBERJID as groupMemberJid,
      COALESCE(NULLIF(gm.ZCONTACTNAME, ''), ppn.ZPUSHNAME) as groupMemberName,
      m.ZMESSAGEDATE as messageDate,
      m.ZISFROMME as isFromMe,
      m.ZMESSAGETYPE as messageType,
      m.ZMEDIAITEM as mediaItemId,
      media.ZMEDIALOCALPATH as mediaLocalPath
    FROM ZWAMESSAGE m
    LEFT JOIN ZWACHATSESSION c ON m.ZCHATSESSION = c.Z_PK
    LEFT JOIN ZWAGROUPMEMBER gm ON m.ZGROUPMEMBER = gm.Z_PK
    LEFT JOIN ZWAPROFILEPUSHNAME ppn ON gm.ZMEMBERJID = ppn.ZJID
    LEFT JOIN ZWAMEDIAITEM media ON m.ZMEDIAITEM = media.Z_PK
    WHERE m.ZMESSAGEDATE > ?
    ORDER BY m.ZMESSAGEDATE ASC
  `,
    )
    .all(sinceTimestamp)

  const rows = z.array(MessageRowSchema).parse(rawRows)

  return rows.map((row) => {
    const isGroup = row.chatJid?.endsWith('@g.us') ?? false
    // For group chats, use the group member's JID as the actual sender
    // For individual chats, use fromJid (which is the sender's JID)
    const senderJid = isGroup ? row.groupMemberJid : row.fromJid

    // Look up phone number from contacts by sender JID (LID or WhatsApp JID format)
    const senderPhoneNumber = senderJid ? (phoneMap.get(senderJid) ?? null) : null

    // For individual chats, the chatName is the contact's name
    // For group chats, try to use the group member's contact name (often null)
    const senderName = isGroup ? row.groupMemberName : row.chatName

    return {
      id: String(row.id),
      chatId: row.chatJid ?? String(row.chatSessionId),
      chatName: row.chatName,
      text: row.text,
      senderJid,
      senderName,
      senderPhoneNumber,
      timestamp: coreDataToDate(row.messageDate).toISOString(),
      isFromMe: row.isFromMe === 1,
      messageType: row.messageType,
      hasMedia: row.mediaItemId !== null,
      mediaLocalPath: row.mediaLocalPath,
    }
  })
}

export function getMessageCount(db: Database.Database): number {
  const rawRow = db.prepare('SELECT COUNT(*) as count FROM ZWAMESSAGE').get()
  const row = CountRowSchema.parse(rawRow)
  return row.count
}

export function getChatCount(db: Database.Database): number {
  const rawRow = db
    .prepare(
      'SELECT COUNT(*) as count FROM ZWACHATSESSION WHERE ZREMOVED = 0 OR ZREMOVED IS NULL',
    )
    .get()
  const row = CountRowSchema.parse(rawRow)
  return row.count
}
