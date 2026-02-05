// WhatsApp Desktop SQLite message reader
// Reads from: ~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared/ChatStorage.sqlite
//
// Database notes:
// - ZMESSAGEDATE uses Core Data epoch (seconds since Jan 1, 2001)
// - Add 978307200 to convert to Unix timestamp
// - ZISFROMME: 1 = outgoing, 0 = incoming
// - JIDs ending in @g.us are group chats
// - Group member JIDs use @lid (Linked Identity) format for privacy
// - Phone numbers are ONLY available for contacts saved in your address book
//   (via ContactsV2.sqlite). For non-contacts, only name/push name is available.

import Database from 'better-sqlite3'
import { existsSync } from 'fs'

export {
  fetchChats,
  fetchMessages,
  getChatCount,
  getMessageCount,
  getWhatsAppContactsDbPath,
  getWhatsAppDatabasePath,
} from './queries'
export type { WhatsappSqliteChat, WhatsappSqliteMessage } from './types'

import { getWhatsAppDatabasePath } from './queries'

export function isWhatsAppInstalled(): boolean {
  return existsSync(getWhatsAppDatabasePath())
}

export function openWhatsAppDatabase(): Database.Database {
  const dbPath = getWhatsAppDatabasePath()

  if (!existsSync(dbPath)) {
    throw new Error(
      'WhatsApp Desktop database not found. Is WhatsApp Desktop installed?',
    )
  }

  // Open in read-only mode to avoid conflicts with WhatsApp
  return new Database(dbPath, { readonly: true })
}
