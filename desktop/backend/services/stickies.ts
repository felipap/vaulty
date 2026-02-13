import { createLogger } from '../lib/logger'
import { apiRequest } from '../lib/contexter-api'
import { fetchStickies, type Sticky } from '../sources/stickies'
import { createScheduledService, type SyncResult } from './scheduler'

const log = createLogger('macos-stickies')

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

async function uploadStickies(stickies: Sticky[]): Promise<void> {
  await apiRequest({
    path: '/api/macos-stickies',
    body: { stickies },
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
