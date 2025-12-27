import { startAnimating, stopAnimating } from '../tray/animate'
import { captureScreen, uploadScreenshot } from '../sources/screenshots'
import { createScheduledService } from './scheduler'

async function captureAndUpload(): Promise<void> {
  console.log('[screenshots] Capturing screen...')

  const imageBuffer = await captureScreen()
  if (!imageBuffer) {
    throw new Error('Failed to capture screen')
  }

  startAnimating('old')
  try {
    await uploadScreenshot(imageBuffer)
  } finally {
    stopAnimating()
  }
}

export const screenshotsService = createScheduledService({
  name: 'screenshots',
  configKey: 'screenCapture',
  onSync: captureAndUpload,
})
