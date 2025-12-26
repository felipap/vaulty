import sharp from "sharp"
import { config } from "./config"

export async function resizeScreenshot(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer)
  const metadata = await image.metadata()

  const needsResize =
    (metadata.width && metadata.width > config.image.maxWidth) ||
    (metadata.height && metadata.height > config.image.maxHeight)

  let pipeline = image

  if (needsResize) {
    pipeline = pipeline.resize(config.image.maxWidth, config.image.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  return pipeline.webp({ quality: config.image.quality }).toBuffer()
}

export async function resizeAttachmentImage(
  base64Data: string
): Promise<string> {
  const { resizeRatio, quality, format } = config.imessageAttachment

  // No resize needed if ratio is 1
  if (resizeRatio >= 1) {
    return base64Data
  }

  const inputBuffer = Buffer.from(base64Data, "base64")
  const image = sharp(inputBuffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    return base64Data
  }

  const newWidth = Math.round(metadata.width * resizeRatio)
  const newHeight = Math.round(metadata.height * resizeRatio)

  const outputBuffer = await image
    .resize(newWidth, newHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat(format, { quality })
    .toBuffer()

  return outputBuffer.toString("base64")
}

