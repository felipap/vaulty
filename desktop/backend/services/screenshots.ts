import { store } from '../store'
import { startAnimating, stopAnimating } from '../tray/animate'
import { captureScreen, uploadScreenshot } from '../sources/screenshots'
import type { Service } from './index'

let captureInterval: NodeJS.Timeout | null = null
let nextCaptureTime: Date | null = null

async function captureAndUpload(): Promise<void> {
  console.log('[screenshots] Capturing screen...')

  const imageBuffer = await captureScreen()
  if (!imageBuffer) {
    console.error('[screenshots] Failed to capture screen')
    return
  }

  startAnimating('old')
  try {
    await uploadScreenshot(imageBuffer)
  } catch (error) {
    console.error('[screenshots] Failed to upload screenshot:', error)
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
  try {
    await captureAndUpload()
  } catch (error) {
    console.error('[screenshots] Manual capture failed:', error)
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

export const screenshotsService: Service = {
  name: 'screenshots',
  start,
  stop,
  restart,
  isRunning,
  runNow,
  getNextRunTime,
  getTimeUntilNextRun,
}
