import { createIMessageSDK, fetchMessages } from '../../sources/imessage'
import { store } from '../../store'
import { startAnimating } from '../../tray/animate'
import { catchAndComplain } from '../../lib/utils'
import { uploadMessages } from './upload'

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

const BATCH_SIZE = 20 // Upload messages in batches to show progress

// BACKFILL APPROACH:
// The iMessage SDK returns messages in descending order (newest first) and
// doesn't support offset/cursor pagination. To backfill N days:
// 1. We fetch ALL messages since the start date (no limit)
// 2. We batch them for upload, showing progress per batch
// This loads all messages into memory, which could be an issue for very large
// date ranges. If this becomes a problem, we'd need to implement our own
// pagination by tracking the oldest seen date and re-querying.
function cleanup(sdk: ReturnType<typeof createIMessageSDK>, stopAnimating: () => void) {
  sdk.close()
  stopAnimating()
  backfillInProgress = false
}

async function runBackfill(days = 120): Promise<void> {
  if (backfillInProgress) {
    console.log('[imessage] Backfill already in progress')
    return
  }

  backfillInProgress = true
  backfillCancelled = false
  backfillProgress = { status: 'running', phase: 'loading', current: 0, total: 0 }

  console.log(`[imessage] Starting backfill for ${days} days`)

  const config = store.get('imessageExport')
  const backfillSdk = createIMessageSDK()
  const stopAnimating = startAnimating('old')

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  console.log(`[imessage] Fetching all messages since ${since.toISOString()}...`)
  const fetchStart = Date.now()

  const messages = await fetchMessages(backfillSdk, since, {
    includeAttachments: config.includeAttachments,
  })

  const fetchEnd = Date.now()
  console.log(`[imessage] Found ${messages.length} messages to backfill in ${fetchEnd - fetchStart}ms`)

  if (messages.length === 0) {
    backfillProgress = { status: 'completed', current: 0, total: 0, messageCount: 0, itemsUploaded: 0 }
    cleanup(backfillSdk, stopAnimating)
    return
  }

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

    const res = await catchAndComplain(uploadMessages(batch))
    if ('error' in res) {
      const errorMessage = `Failed to upload page ${pageNumber}. ${itemsUploaded} items uploaded in total.`
      console.error(`[imessage] ${errorMessage} Error: ${res.error}`)
      backfillProgress = {
        ...backfillProgress,
        status: 'error',
        failedPage: pageNumber,
        itemsUploaded,
        error: `${errorMessage} Error: ${res.error}`,
      }
      cleanup(backfillSdk, stopAnimating)
      return
    }

    itemsUploaded += batch.length
    backfillProgress.current++
    backfillProgress.itemsUploaded = itemsUploaded
    console.log(
      `[imessage] Backfill progress: ${backfillProgress.current}/${totalBatches} batches ` +
      `(${itemsUploaded}/${messages.length} messages)`,
    )
  }

  if (backfillCancelled) {
    backfillProgress = { ...backfillProgress, status: 'cancelled', itemsUploaded }
    console.log(`[imessage] Backfill cancelled. ${itemsUploaded} items uploaded.`)
  } else {
    backfillProgress = { ...backfillProgress, status: 'completed', itemsUploaded }
    console.log(`[imessage] Backfill completed. ${itemsUploaded} items uploaded.`)
  }

  cleanup(backfillSdk, stopAnimating)
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
