import Database from 'better-sqlite3'
import { catchAndComplain } from '../../lib/utils'
import {
  fetchMessages,
  openWhatsAppDatabase,
  type WhatsAppMessage as SqliteMessage,
} from '../../sources/whatsapp-sqlite'
import { store } from '../../store'
import { startAnimating } from '../../tray/animate'
import { createScheduledService } from '../scheduler'
import type { WhatsAppMessage } from './types'
import { uploadWhatsAppMessages } from './upload'

let db: Database.Database | null = null

function toWhatsAppMessage(msg: SqliteMessage): WhatsAppMessage {
  return {
    id: `sqlite-${msg.id}`,
    chatId: msg.chatId,
    chatName: msg.chatName,
    text: msg.text,
    sender: msg.senderJid,
    senderName: null,
    timestamp: msg.timestamp,
    isFromMe: msg.isFromMe,
    hasMedia: msg.hasMedia,
    attachments: msg.mediaLocalPath
      ? [
          {
            id: `sqlite-media-${msg.id}`,
            filename: null,
            mimeType: null,
            size: null,
            localPath: msg.mediaLocalPath,
            dataBase64: null,
          },
        ]
      : [],
  }
}

function getLastExportedDate(): Date | null {
  const stored = store.get('whatsappSqlite').lastExportedMessageDate
  if (!stored) {
    return null
  }
  return new Date(stored)
}

function setLastExportedDate(date: Date): void {
  const config = store.get('whatsappSqlite')
  store.set('whatsappSqlite', {
    ...config,
    lastExportedMessageDate: date.toISOString(),
  })
}

async function exportAndUpload(): Promise<void> {
  console.log('[whatsapp-sqlite] Exporting messages...')

  if (!db) {
    throw new Error('Database not initialized')
  }

  const lastExported = getLastExportedDate()
  const since = lastExported
    ? new Date(lastExported.getTime() + 1_000)
    : new Date(Date.now() - 24 * 60 * 60 * 1000)

  const sqliteMessages = fetchMessages(db, since)

  if (sqliteMessages.length === 0) {
    console.log('[whatsapp-sqlite] No new messages to export')
    return
  }

  const messages = sqliteMessages.map(toWhatsAppMessage)

  const latestTimestamp = messages.reduce(
    (max, msg) => (msg.timestamp > max ? msg.timestamp : max),
    messages[0].timestamp,
  )

  console.debug(
    `[whatsapp-sqlite] Found ${messages.length.toLocaleString()} new messages`,
  )

  const stopAnimating = startAnimating('old')

  const res = await catchAndComplain(uploadWhatsAppMessages(messages, 'sqlite'))
  stopAnimating()

  if ('error' in res) {
    throw new Error(`uploadWhatsAppMessages failed: ${res.error}`)
  }

  setLastExportedDate(new Date(latestTimestamp))
}

export const whatsappSqliteService = createScheduledService({
  name: 'whatsapp-sqlite',
  configKey: 'whatsappSqlite',
  onSync: exportAndUpload,
  onStart: () => {
    db = openWhatsAppDatabase()
  },
  onStop: () => {
    if (db) {
      db.close()
      db = null
    }
  },
})
