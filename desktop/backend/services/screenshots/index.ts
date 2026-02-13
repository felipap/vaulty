import { createLogger } from '../../lib/logger'
import { captureScreen } from '../../sources/screenshots'
import { uploadScreenshot } from './upload'
import { createScheduledService, type SyncResult } from '../scheduler'

const log = createLogger('screenshots')

async function captureAndUpload(): Promise<SyncResult> {
  log.info('Capturing screen...')

  const imageBuffer = await captureScreen()
  if (!imageBuffer) {
    return { error: 'Failed to capture screen' }
  }

  await uploadScreenshot(imageBuffer)
  return { success: true }
}

export const screenshotsService = createScheduledService({
  name: 'screenshots',
  configKey: 'screenCapture',
  onSync: captureAndUpload,
})
