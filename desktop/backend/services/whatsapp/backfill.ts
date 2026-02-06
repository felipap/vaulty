import {
  fetchMessages,
  openWhatsAppDatabase,
  type WhatsappSqliteMessage,
} from '../../sources/whatsapp-sqlite'
import { startAnimating } from '../../tray/animate'
import { catchAndComplain } from '../../lib/utils'
import { store } from '../../store'
import type { WhatsAppMessage } from './types'
import { uploadWhatsAppMessages } from './upload'

type BackfillStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
type BackfillPhase = 'loading' | 'uploading'

export type BackfillProgress = {
  status: BackfillStatus
  phase?: BackfillPhase
  current: number
  total: number
  messageCount?: number
  itemsUploaded?: number
  failedPage?: number
  error?: string
}

let backfillInProgress = false
let backfillCancelled = false
let backfillProgress: BackfillProgress = {
  status: 'idle',
  current: 0,
  total: 0,
}

const BATCH_SIZE = 50

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  pdf: 'application/pdf',
}

function getMimeTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream'
}

function getFilenameFromPath(path: string): string {
  return path.split('/').pop() ?? 'unknown'
}

function toWhatsAppMessage(msg: WhatsappSqliteMessage): WhatsAppMessage {
  return {
    id: `sqlite-${msg.id}`,
    chatId: msg.chatId,
    chatName: msg.chatName,
    text: msg.text,
    sender: msg.senderJid,
    senderName: msg.senderName,
    senderPhoneNumber: msg.senderPhoneNumber,
    timestamp: msg.timestamp,
    isFromMe: msg.isFromMe,
    messageType: msg.messageType,
    hasMedia: msg.hasMedia,
    attachments: msg.mediaLocalPath
      ? [
          {
            id: `sqlite-media-${msg.id}`,
            filename: getFilenameFromPath(msg.mediaLocalPath),
            mimeType: getMimeTypeFromPath(msg.mediaLocalPath),
            size: null,
            localPath: msg.mediaLocalPath,
            dataBase64: '',
          },
        ]
      : [],
  }
}

async function runBackfill(days = 120): Promise<void> {
  if (backfillInProgress) {
    console.log('[whatsapp] Backfill already in progress')
    return
  }

  backfillInProgress = true
  backfillCancelled = false
  backfillProgress = {
    status: 'running',
    phase: 'loading',
    current: 0,
    total: 0,
  }

  console.log(`[whatsapp] Starting backfill for ${days} days`)

  const stopAnimating = startAnimating('old')
  let db: ReturnType<typeof openWhatsAppDatabase> | null = null

  try {
    db = openWhatsAppDatabase()
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to open WhatsApp database'
    console.error(`[whatsapp] ${errorMessage}`)
    backfillProgress = {
      status: 'error',
      current: 0,
      total: 0,
      error: errorMessage,
    }
    stopAnimating()
    backfillInProgress = false
    return
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  console.log(
    `[whatsapp] Fetching all messages since ${since.toISOString()}...`,
  )
  const fetchStart = Date.now()

  const sqliteMessages = fetchMessages(db, since)

  const fetchEnd = Date.now()
  console.log(
    `[whatsapp] Found ${sqliteMessages.length.toLocaleString()} messages to backfill in ${fetchEnd - fetchStart}ms`,
  )

  const ignoredChatIds = store.get('whatsappSqlite').ignoredChatIds ?? []
  const filteredMessages = sqliteMessages.filter(
    (msg) => !ignoredChatIds.includes(msg.chatId),
  )

  if (filteredMessages.length === 0) {
    backfillProgress = {
      status: 'completed',
      current: 0,
      total: 0,
      messageCount: 0,
      itemsUploaded: 0,
    }
    db.close()
    stopAnimating()
    backfillInProgress = false
    return
  }

  const messages = filteredMessages.map(toWhatsAppMessage)

  // Switch to uploading phase
  const totalBatches = Math.ceil(messages.length / BATCH_SIZE)
  let itemsUploaded = 0
  backfillProgress = {
    status: 'running',
    phase: 'uploading',
    current: 0,
    total: totalBatches,
    messageCount: messages.length,
    itemsUploaded: 0,
  }

  // Upload in batches
  for (let i = 0; i < messages.length && !backfillCancelled; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)
    const pageNumber = Math.floor(i / BATCH_SIZE) + 1

    const res = await catchAndComplain(uploadWhatsAppMessages(batch, 'sqlite'))
    if ('error' in res) {
      const errorMessage = `Failed to upload page ${pageNumber}. ${itemsUploaded} items uploaded in total.`
      console.error(`[whatsapp] ${errorMessage} Error: ${res.error}`)
      backfillProgress = {
        ...backfillProgress,
        status: 'error',
        failedPage: pageNumber,
        itemsUploaded,
        error: `${errorMessage} Error: ${res.error}`,
      }
      db.close()
      stopAnimating()
      backfillInProgress = false
      return
    }

    itemsUploaded += batch.length
    backfillProgress.current++
    backfillProgress.itemsUploaded = itemsUploaded
    console.log(
      `[whatsapp] Backfill progress: ${backfillProgress.current}/${totalBatches} batches ` +
        `(${itemsUploaded}/${messages.length} messages)`,
    )
  }

  if (backfillCancelled) {
    backfillProgress = {
      ...backfillProgress,
      status: 'cancelled',
      itemsUploaded,
    }
    console.log(
      `[whatsapp] Backfill cancelled. ${itemsUploaded} items uploaded.`,
    )
  } else {
    backfillProgress = {
      ...backfillProgress,
      status: 'completed',
      itemsUploaded,
    }
    console.log(
      `[whatsapp] Backfill completed. ${itemsUploaded} items uploaded.`,
    )
  }

  db.close()
  stopAnimating()
  backfillInProgress = false
}

function cancelBackfill(): void {
  if (backfillInProgress) {
    backfillCancelled = true
    console.log('[whatsapp] Cancelling backfill...')
  }
}

function getBackfillProgress(): BackfillProgress {
  return { ...backfillProgress }
}

export const whatsappBackfill = {
  run: runBackfill,
  cancel: cancelBackfill,
  getProgress: getBackfillProgress,
}
