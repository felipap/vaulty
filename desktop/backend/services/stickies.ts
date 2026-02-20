import { createLogger } from '../lib/logger'
import { apiRequest } from '../lib/contexter-api'
import { encryptText } from '../lib/encryption'
import { getEncryptionKey } from '../store'
import { fetchStickies, type Sticky } from '../sources/stickies'
import { createScheduledService, type SyncResult } from './scheduler'

const log = createLogger('macos-stickies')

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

function encryptStickies(stickies: Sticky[], encryptionKey: string): Sticky[] {
  return stickies.map((s) => ({
    id: s.id,
    text: encryptText(s.text, encryptionKey),
  }))
}

async function uploadStickies(stickies: Sticky[]): Promise<void> {
  const encryptionKey = getEncryptionKey()
  if (!encryptionKey) {
    log.error('Encryption key not set, skipping upload')
    return
  }

  const encrypted = encryptStickies(stickies, encryptionKey)
  await apiRequest({
    path: '/api/macos-stickies',
    body: { stickies: encrypted },
  })
  log.info(`Uploaded ${stickies.length} macOS stickies`)
}

async function syncAndUpload(): Promise<SyncResult> {
  log.info('Syncing...')
  await yieldToEventLoop()

  const stickies = fetchStickies()
  if (stickies.length === 0) {
    log.info('No stickies to sync')
    return { success: true }
  }

  log.info(`Fetched ${stickies.length} macOS stickies`)
  await yieldToEventLoop()

  await uploadStickies(stickies)
  return { success: true }
}

export const macosStickiesService = createScheduledService({
  name: 'macos-stickies',
  configKey: 'macosStickiesSync',
  onSync: syncAndUpload,
})
