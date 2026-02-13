import { createLogger } from '../lib/logger'
import { apiRequest } from '../lib/contexter-api'
import { fetchWinStickyNotes, type WinStickyNote } from '../sources/win-sticky-notes'
import { createScheduledService, type SyncResult } from './scheduler'

const log = createLogger('win-sticky-notes')

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

async function uploadStickyNotes(notes: WinStickyNote[]): Promise<void> {
  await apiRequest({
    path: '/api/win-sticky-notes',
    body: { stickies: notes },
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
