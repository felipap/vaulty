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

