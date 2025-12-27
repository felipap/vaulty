import { store } from '../store'
import { startAnimating, stopAnimating } from '../tray/animate'
import { captureScreen, uploadScreenshot } from '../sources/screenshots'
import type { Service, SyncStatus } from './index'

let captureInterval: NodeJS.Timeout | null = null
let nextCaptureTime: Date | null = null
let lastSyncStatus: SyncStatus = null

async function captureAndUpload(): Promise<void> {
  console.log('[screenshots] Capturing screen...')

  const imageBuffer = await captureScreen()
  if (!imageBuffer) {
    console.error('[screenshots] Failed to capture screen')
    lastSyncStatus = 'error'
    return
  }

  startAnimating('old')
  try {
    await uploadScreenshot(imageBuffer)
    lastSyncStatus = 'success'
  } catch (error) {
    console.error('[screenshots] Failed to upload screenshot:', error)
    lastSyncStatus = 'error'
  } finally {
    stopAnimating()
  }
}

function scheduleNextCapture(): void {
  const config = store.get('screenCapture')
  const intervalMs = config.intervalMinutes * 60 * 1000

  nextCaptureTime = new Date(Date.now() + intervalMs)

  captureInterval = setTimeout(async () => {
    try {
      await captureAndUpload()
    } catch (error) {
      console.error('[screenshots] Scheduled capture failed:', error)
    }
    scheduleNextCapture()
  }, intervalMs)
}

async function start(): Promise<void> {
  if (captureInterval) {
    console.log('[screenshots] Already running')
    return
  }

  const config = store.get('screenCapture')
  if (!config.enabled) {
    console.log('[screenshots] Disabled')
    return
  }

  console.log('[screenshots] Starting...')

  // Do initial capture, but don't let failures prevent scheduling
  try {
    await captureAndUpload()
  } catch (error) {
    console.error('[screenshots] Initial capture failed:', error)
  }

  scheduleNextCapture()
}

function stop(): void {
  if (captureInterval) {
    clearTimeout(captureInterval)
    captureInterval = null
    nextCaptureTime = null
    console.log('[screenshots] Stopped')
  }
}

function restart(): void {
  stop()
  start()
}

function isRunning(): boolean {
  return captureInterval !== null
}

async function runNow(): Promise<void> {
  const config = store.get('screenCapture')
  if (!config.enabled) {
    throw new Error('Screen capture is disabled')
  }

  try {
    await captureAndUpload()
  } catch (error) {
    console.error('[screenshots] Manual capture failed:', error)
  }

  // Restart the clock after manual run
  if (captureInterval) {
    clearTimeout(captureInterval)
    scheduleNextCapture()
  }
}

function getNextRunTime(): Date | null {
  return nextCaptureTime
}

function getTimeUntilNextRun(): number {
  if (!nextCaptureTime) {
    return 0
  }
  return Math.max(0, nextCaptureTime.getTime() - Date.now())
}

function isEnabled(): boolean {
  return store.get('screenCapture').enabled
}

function getLastSyncStatus(): SyncStatus {
  return lastSyncStatus
}

export const screenshotsService: Service = {
  name: 'screenshots',
  start,
  stop,
  restart,
  isRunning,
  isEnabled,
  runNow,
  getNextRunTime,
  getTimeUntilNextRun,
  getLastSyncStatus,
}
