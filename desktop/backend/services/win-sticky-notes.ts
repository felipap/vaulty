import { createLogger } from '../lib/logger'
import { apiRequest } from '../lib/contexter-api'
import { encryptText } from '../lib/encryption'
import { getEncryptionKey } from '../store'
import { fetchWinStickyNotes, type WinStickyNote } from '../sources/win-sticky-notes'
import { createScheduledService, type SyncResult } from './scheduler'

const log = createLogger('win-sticky-notes')

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

function encryptStickyNotes(notes: WinStickyNote[], encryptionKey: string): WinStickyNote[] {
  return notes.map((n) => ({
    id: n.id,
    text: encryptText(n.text, encryptionKey),
  }))
}

async function uploadStickyNotes(notes: WinStickyNote[]): Promise<void> {
  const encryptionKey = getEncryptionKey()
  if (!encryptionKey) {
    log.error('Encryption key not set, skipping upload')
    return
  }

  const encrypted = encryptStickyNotes(notes, encryptionKey)
  await apiRequest({
    path: '/api/win-sticky-notes',
    body: { stickies: encrypted },
  })
  log.info(`Uploaded ${notes.length} Windows sticky notes`)
}

async function syncAndUpload(): Promise<SyncResult> {
  log.info('Syncing...')
  await yieldToEventLoop()

  const notes = fetchWinStickyNotes()
  if (notes.length === 0) {
    log.info('No sticky notes to sync')
    return { success: true }
  }

  log.info(`Fetched ${notes.length} Windows sticky notes`)
  await yieldToEventLoop()

  await uploadStickyNotes(notes)
  return { success: true }
}

export const winStickyNotesService = createScheduledService({
  name: 'win-sticky-notes',
  configKey: 'winStickyNotesSync',
  onSync: syncAndUpload,
})
