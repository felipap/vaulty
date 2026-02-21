import Database from 'better-sqlite3'
import { catchAndComplain } from '../../lib/utils'
import {
  fetchMessagesBatch,
  openWhatsAppDatabase,
  type WhatsappSqliteMessage,
} from '../../sources/whatsapp-sqlite'
import { store } from '../../store'
import { createScheduledService, type SyncResult } from '../scheduler'
import { yieldToEventLoop } from '../upload-utils'
import { log } from './index'
import type { WhatsAppMessage } from './types'
import { uploadWhatsAppMessages } from './upload'

const BATCH_SIZE = 50

let db: Database.Database | null = null

function toWhatsAppMessage(msg: WhatsappSqliteMessage): WhatsAppMessage {
  return {
    id: `sqlite-${msg.id}`,
    chatId: msg.chatId,
    chatName: msg.chatName,
    text: msg.text,
    senderJid: msg.senderJid,
    senderName: msg.senderName,
    senderPhoneNumber: msg.senderPhoneNumber,
    timestamp: msg.timestamp,
    messageType: msg.messageType,
    isFromMe: msg.isFromMe,
    chatIsGroupChat: msg.chatIsGroupChat,
    hasMedia: msg.hasMedia,
    attachments: [], // TODO: implement attachment syncing
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

async function exportAndUpload(): Promise<SyncResult> {
  log.info('Exporting messages...')
  await yieldToEventLoop()

  if (!db) {
    return { error: 'Database not initialized' }
  }

  const lastExported = getLastExportedDate()
  const since = lastExported
    ? new Date(lastExported.getTime() + 1_000)
    : new Date(Date.now() - 24 * 60 * 60 * 1000)

  const ignoredChatIds = store.get('whatsappSqlite').ignoredChatIds ?? []
  let nextAfterDate: number | undefined = undefined
  let nextAfterId: number | undefined = undefined
  let totalUploaded = 0
  let latestTimestamp: string | null = null

  for (;;) {
    const { messages: sqliteMessages, nextAfterMessageDate, nextAfterId: nextId } =
      fetchMessagesBatch(db, since, BATCH_SIZE, nextAfterDate, nextAfterId)

    const filtered = sqliteMessages.filter(
      (msg) => !ignoredChatIds.includes(msg.chatId),
    )

    if (filtered.length > 0) {
      const batch = filtered.map(toWhatsAppMessage)
      const batchLatest = batch.reduce(
        (max, msg) => (msg.timestamp > max ? msg.timestamp : max),
        batch[0].timestamp,
      )
      if (latestTimestamp === null || batchLatest > latestTimestamp) {
        latestTimestamp = batchLatest
      }

      const res = await catchAndComplain(uploadWhatsAppMessages(batch, 'sqlite'))
      if ('error' in res) {
        return { error: `uploadWhatsAppMessages failed: ${res.error}` }
      }
      totalUploaded += batch.length
    }

    nextAfterDate = nextAfterMessageDate ?? undefined
    nextAfterId = nextId ?? undefined
    if (nextAfterMessageDate === null) {
      break
    }
    await yieldToEventLoop()
  }

  if (totalUploaded > 0 && latestTimestamp) {
    log.debug(`Uploaded ${totalUploaded.toLocaleString()} new messages`)
    setLastExportedDate(new Date(latestTimestamp))
  } else if (totalUploaded === 0) {
    log.info('No new messages to export')
  }

  return { success: true }
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
