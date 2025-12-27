import { IMessageSDK } from '@photon-ai/imessage-kit'
import { apiRequest } from '../lib/contexter-api'
import { catchAndComplain } from '../lib/utils'
import {
  createIMessageSDK,
  fetchMessages,
  type Message,
} from '../sources/imessage'
import { getDeviceId, store } from '../store'
import { startAnimating } from '../tray/animate'
import { createScheduledService } from './scheduler'

async function uploadMessages(
  messages: Message[],
): Promise<{ error: string } | {}> {
  if (messages.length === 0) {
    return {}
  }

  const res = await apiRequest({
    path: '/api/imessages',
    body: {
      messages,
      syncTime: new Date().toISOString(),
      deviceId: getDeviceId(),
      messageCount: messages.length,
    },
  })
  if ('error' in res) {
    return { error: res.error }
  }

  console.log(`Uploaded ${messages.length} messages successfully`)
  return {}
}

let sdk: IMessageSDK | null = null
let lastExportedMessageDate: Date | null = null

async function exportAndUpload(): Promise<void> {
  console.log('[imessage] Exporting messages...')

  if (!sdk) {
    throw new Error('SDK not initialized')
  }

  const config = store.get('imessageExport')
  const since =
    lastExportedMessageDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
  const messages = await fetchMessages(sdk, since, {
    includeAttachments: config.includeAttachments,
  })

  if (messages.length === 0) {
    console.log('[imessage] No new messages to export')
    return
  }

  const latestDateStr = messages.reduce(
    (max, msg) => (msg.date > max ? msg.date : max),
    messages[0].date,
  )

  console.debug('[imessage] Found', messages.length, 'new messages')

  const stopAnimating = startAnimating('old')

  const res = await catchAndComplain(uploadMessages(messages))
  stopAnimating()

  if ('error' in res) {
    throw new Error(`uploadMessages failed: ${res.error}`)
  }

  lastExportedMessageDate = new Date(latestDateStr)
}

export const imessageService = createScheduledService({
  name: 'imessage',
  configKey: 'imessageExport',
  onSync: exportAndUpload,
  onStart: () => {
    sdk = createIMessageSDK()
  },
  onStop: () => {
    if (sdk) {
      sdk.close()
      sdk = null
    }
  },
})

// Backfill functionality
let backfillInProgress = false
type BackfillStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
export type BackfillProgress = {
  current: number
  total: number
  status: BackfillStatus
  error?: string
}
let backfillProgress: BackfillProgress = {
  current: 0,
  total: 0,
  status: 'idle',
}
let backfillCancelled = false

async function runBackfill(days = 120): Promise<void> {
  if (backfillInProgress) {
    console.log('[imessage] Backfill already in progress')
    return
  }

  backfillInProgress = true
  backfillCancelled = false
  backfillProgress = { current: 0, total: 0, status: 'running' }

  console.log(`[imessage] Starting backfill for ${days} days`)

  const config = store.get('imessageExport')
  const backfillSdk = createIMessageSDK()
  const stopAnimating = startAnimating('old')

  const endDate = new Date()
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // We'll process day by day to avoid memory issues and show progress
  const totalDays = days
  backfillProgress.total = totalDays

  let currentDate = new Date(startDate)

  while (currentDate < endDate && !backfillCancelled) {
    const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
    if (nextDate > endDate) {
      nextDate.setTime(endDate.getTime())
    }

    const messages = await fetchMessages(backfillSdk, currentDate, {
      includeAttachments: config.includeAttachments,
    })
    const filtered = messages.filter((m) => new Date(m.date) < nextDate)

    if (filtered.length > 0) {
      const res = await catchAndComplain(uploadMessages(filtered))
      if ('error' in res) {
        console.error('[imessage] Backfill upload error:', res.error)
        backfillProgress.status = 'error'
        backfillProgress.error = res.error
        break
      }
      console.log(
        `[imessage] Backfill: uploaded ${filtered.length} messages for ${currentDate.toDateString()}`,
      )
    }

    backfillProgress.current++
    currentDate = nextDate
  }

  backfillSdk.close()
  stopAnimating()
  backfillInProgress = false

  if (backfillCancelled) {
    backfillProgress.status = 'cancelled'
    console.log('[imessage] Backfill cancelled')
  } else if (backfillProgress.status !== 'error') {
    backfillProgress.status = 'completed'
    console.log('[imessage] Backfill completed')
  }
}

function cancelBackfill(): void {
  if (backfillInProgress) {
    backfillCancelled = true
    console.log('[imessage] Cancelling backfill...')
  }
}

function getBackfillProgress(): BackfillProgress {
  return { ...backfillProgress }
}

export const imessageBackfill = {
  run: runBackfill,
  cancel: cancelBackfill,
  getProgress: getBackfillProgress,
}
