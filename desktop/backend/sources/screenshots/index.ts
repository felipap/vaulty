import { desktopCapturer, screen } from 'electron'
import sharp from 'sharp'
import { apiFormDataRequest } from '../../lib/contexter-api'
import { encryptBuffer } from '../../lib/encryption'
import { getEncryptionKey } from '../../store'

const IMAGE_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 80,
}

export async function captureScreen(): Promise<Buffer | null> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  })

  if (sources.length === 0) {
    console.error('No screen sources found')
    return null
  }

  const primarySource = sources[0]
  const thumbnail = primarySource.thumbnail

  if (thumbnail.isEmpty()) {
    console.error('Screen capture returned empty thumbnail')
    return null
  }

  const pngBuffer = thumbnail.toPNG()
  if (pngBuffer.length === 0) {
    console.error('Screen capture returned empty PNG buffer')
    return null
  }

  return pngBuffer
}

async function resizeScreenshot(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer)
  const metadata = await image.metadata()

  const needsResize =
    (metadata.width && metadata.width > IMAGE_CONFIG.maxWidth) ||
    (metadata.height && metadata.height > IMAGE_CONFIG.maxHeight)

  let pipeline = image

  if (needsResize) {
    pipeline = pipeline.resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  return pipeline.webp({ quality: IMAGE_CONFIG.quality }).toBuffer()
}

export async function uploadScreenshot(imageBuffer: Buffer): Promise<void> {
  // Resize to webp first
  const resizedBuffer = await resizeScreenshot(imageBuffer)

  // Get dimensions before potential encryption
  const metadata = await sharp(resizedBuffer).metadata()
  const width = metadata.width || 0
  const height = metadata.height || 0

  const encryptionKey = getEncryptionKey()
  if (!encryptionKey) {
    return
  }
  const finalBuffer = encryptBuffer(resizedBuffer, encryptionKey)

  const mimeType = 'application/octet-stream'
  const extension = 'enc'

  const formData = new FormData()
  const uint8Array = new Uint8Array(finalBuffer)
  const blob = new Blob([uint8Array], { type: mimeType })
  formData.append('screenshot', blob, `screenshot-${Date.now()}.${extension}`)
  formData.append('encrypted', 'true')
  formData.append('width', String(width))
  formData.append('height', String(height))

  await apiFormDataRequest({
    path: '/api/screenshots',
    formData,
  })

  console.log('Screenshot uploaded successfully')
}
