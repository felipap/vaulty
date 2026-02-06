import { readFile, writeFile, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)

const IMAGE_CONFIG = {
  resizeRatio: 0.5, // 50% of original size
  quality: 70,
  format: 'jpeg' as const,
}

export function isHeicFile(path: string): boolean {
  const lower = path.toLowerCase()
  return lower.endsWith('.heic') || lower.endsWith('.heif')
}

export async function convertHeicToJpeg(inputBuffer: Buffer): Promise<Buffer> {
  // Use macOS's built-in sips tool for HEIC conversion - no external dependencies
  const tempId = randomUUID()
  const inputPath = join(tmpdir(), `heic-input-${tempId}.heic`)
  const outputPath = join(tmpdir(), `heic-output-${tempId}.jpg`)

  await writeFile(inputPath, inputBuffer)

  try {
    await execFileAsync('/usr/bin/sips', [
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      '90', // quality 0-100
      inputPath,
      '--out',
      outputPath,
    ])

    return await readFile(outputPath)
  } finally {
    // Clean up temp files (ignore errors if files don't exist)
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])
  }
}

export type ImageResult =
  | { ok: true; data: string }
  | { ok: false; error: string }

export async function readAndResizeImage(path: string): Promise<ImageResult> {
  try {
    let inputBuffer: Buffer = await readFile(path)

    // Convert HEIC/HEIF to JPEG first since Sharp may not have HEIC support
    if (isHeicFile(path)) {
      inputBuffer = await convertHeicToJpeg(inputBuffer)
    }

    const image = sharp(inputBuffer)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      return { ok: true, data: inputBuffer.toString('base64') }
    }

    const newWidth = Math.round(metadata.width * IMAGE_CONFIG.resizeRatio)
    const newHeight = Math.round(metadata.height * IMAGE_CONFIG.resizeRatio)

    const outputBuffer = await image
      .rotate() // Auto-orient based on EXIF metadata
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(IMAGE_CONFIG.format, { quality: IMAGE_CONFIG.quality })
      .toBuffer()

    return { ok: true, data: outputBuffer.toString('base64') }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

export type AttachmentResult =
  | { ok: true; data: string }
  | { ok: false; error: string }

export async function readAttachmentAsBase64(
  path: string,
  isImage: boolean,
): Promise<AttachmentResult> {
  if (isImage) {
    return readAndResizeImage(path)
  }

  try {
    const buffer = await readFile(path)
    return { ok: true, data: buffer.toString('base64') }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
