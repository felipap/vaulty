import { IMessageSDK } from '@photon-ai/imessage-kit'
import { apiRequest } from '../lib/contexter-api'
import { catchAndComplain } from '../lib/utils'
import {
  createIMessageSDK,
  fetchMessages,
  type Message,
} from '../sources/imessage'
import { store } from '../store'
import { startAnimating } from '../tray/animate'
import type { Service } from './index'

async function uploadMessages(
  messages: Message[],
): Promise<{ error: string } | {}> {
  if (messages.length === 0) {
    return {}
  }

  const res = await apiRequest({
    path: '/api/messages',
    body: { messages },
  })
  if ('error' in res) {
    return { error: res.error }
  }

  console.log(`Uploaded ${messages.length} messages successfully`)
  return {}
}

let sdk: IMessageSDK | null = null
let exportInterval: NodeJS.Timeout | null = null
let nextExportTime: Date | null = null
let lastExportedMessageDate: Date | null = null

async function exportAndUpload(): Promise<void> {
  console.log('[imessage] Exporting messages...')

  if (!sdk) {
    console.debug('[imessage] SDK not initialized')
    return
  }

  const since =
    lastExportedMessageDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
  const messages = await fetchMessages(sdk, since)

  if (messages.length === 0) {
    console.log('[imessage] No new messages to export')
    return
  }

  const latestDate = messages.reduce(
    (max, msg) => (msg.date > max ? msg.date : max),
    messages[0].date,
  )

  console.debug('[imessage] Found', messages.length, 'new messages')

  const stopAnimating = startAnimating('old')

  const res = await catchAndComplain(uploadMessages(messages))
  if ('error' in res) {
    console.error('[imessage] uploadMessages THREW:', res.error)
    stopAnimating()
    return
  }

  stopAnimating()
  lastExportedMessageDate = latestDate
}

function scheduleNextExport(): void {
  const config = store.get('imessageExport')
  const intervalMs = config.intervalMinutes * 60 * 1000

  nextExportTime = new Date(Date.now() + intervalMs)

  exportInterval = setTimeout(async () => {
    await exportAndUpload()
    scheduleNextExport()
  }, intervalMs)
}

async function start(): Promise<void> {
  if (exportInterval) {
    console.log('[imessage] Already running')
    return
  }

  const config = store.get('imessageExport')
  if (!config.enabled) {
    console.log('[imessage] Disabled')
    return
  }

  console.log('[imessage] Starting...')

  sdk = createIMessageSDK()

  // Do initial export, but don't let failures prevent scheduling
  try {
    await exportAndUpload()
  } catch (error) {
    console.error('[imessage] Initial export failed:', error)
  }

  scheduleNextExport()
}

function stop(): void {
  if (exportInterval) {
    clearTimeout(exportInterval)
    exportInterval = null
    nextExportTime = null
    console.log('[imessage] Stopped')
  }

  if (sdk) {
    sdk.close()
    sdk = null
  }
}

function restart(): void {
  stop()
  start()
}

function isRunning(): boolean {
  return exportInterval !== null
}

async function runNow(): Promise<void> {
  if (!sdk) {
    sdk = createIMessageSDK()
  }
  await exportAndUpload()
}

function getNextRunTime(): Date | null {
  return nextExportTime
}

function getTimeUntilNextRun(): number {
  if (!nextExportTime) {
    return 0
  }
  return Math.max(0, nextExportTime.getTime() - Date.now())
}

// Backfill state
let backfillInProgress = false
type BackfillStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
export type BackfillProgress = {
  current: number
  total: number
  status: BackfillStatus
  error?: string
}
let backfillProgress: BackfillProgress = { current: 0, total: 0, status: 'idle' }
let backfillCancelled = false

async function runBackfill(days: number = 120): Promise<void> {
  if (backfillInProgress) {
    console.log('[imessage] Backfill already in progress')
    return
  }

  backfillInProgress = true
  backfillCancelled = false
  backfillProgress = { current: 0, total: 0, status: 'running' }

  console.log(`[imessage] Starting backfill for ${days} days`)

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

    const messages = await fetchMessages(backfillSdk, currentDate)
    const filtered = messages.filter((m) => m.date < nextDate)

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

export const imessageService: Service = {
  name: 'imessage',
  start,
  stop,
  restart,
  isRunning,
  runNow,
  getNextRunTime,
  getTimeUntilNextRun,
}

export const imessageBackfill = {
  run: runBackfill,
  cancel: cancelBackfill,
  getProgress: getBackfillProgress,
}
