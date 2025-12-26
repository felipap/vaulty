import { readFile } from 'fs/promises'
import { IMessageSDK } from '@photon-ai/imessage-kit'
import sharp from 'sharp'

// Config for image resizing
const IMAGE_CONFIG = {
  resizeRatio: 0.5, // 50% of original size
  quality: 70,
  format: 'jpeg' as const,
}

export type Attachment = {
  id: string
  filename: string
  mimeType: string
  path: string
  size: number
  isImage: boolean
  createdAt: string
  dataBase64?: string
}

export type Message = {
  id: string
  guid: string
  text: string | null
  contact: string
  subject: string | null
  date: string
  isFromMe: boolean
  isRead: boolean
  isSent: boolean
  isDelivered: boolean
  hasAttachments: boolean
  attachments: Attachment[]
  service: string
  chatId: string
  chatName: string | null
}

// AI says we need a separate SDK because each keeps a database connection open,
// and it'd be wasteful to do one per call to `fetchMessages`.
export function createIMessageSDK(): IMessageSDK {
  return new IMessageSDK({ debug: false })
}

async function readAndResizeImage(path: string): Promise<string | null> {
  try {
    const inputBuffer = await readFile(path)
    const image = sharp(inputBuffer)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      return inputBuffer.toString('base64')
    }

    const newWidth = Math.round(metadata.width * IMAGE_CONFIG.resizeRatio)
    const newHeight = Math.round(metadata.height * IMAGE_CONFIG.resizeRatio)

    const outputBuffer = await image
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(IMAGE_CONFIG.format, { quality: IMAGE_CONFIG.quality })
      .toBuffer()

    return outputBuffer.toString('base64')
  } catch (err) {
    console.warn(`Failed to resize image at ${path}:`, err)
    return null
  }
}

async function readAttachmentAsBase64(
  path: string,
  isImage: boolean,
): Promise<string | null> {
  if (isImage) {
    return readAndResizeImage(path)
  }

  try {
    const buffer = await readFile(path)
    return buffer.toString('base64')
  } catch (err) {
    console.warn(`Failed to read attachment at ${path}:`, err)
    return null
  }
}

type FetchOptions = {
  includeAttachments?: boolean
}

export async function fetchMessages(
  sdk: IMessageSDK,
  since: Date,
  options: FetchOptions = {},
): Promise<Message[]> {
  const { includeAttachments = true } = options

  const result = await sdk.getMessages({
    since,
    limit: 100,
    excludeOwnMessages: false,
  })

  const messages: Message[] = []

  for (const msg of result.messages) {
    const attachments: Attachment[] = []

    if (includeAttachments) {
      for (const att of msg.attachments) {
        const dataBase64 = await readAttachmentAsBase64(att.path, att.isImage)
        attachments.push({
          id: att.id,
          filename: att.filename,
          mimeType: att.isImage ? 'image/jpeg' : att.mimeType,
          path: att.path,
          size: att.size,
          isImage: att.isImage,
          createdAt: att.createdAt.toISOString(),
          dataBase64: dataBase64 ?? undefined,
        })
      }
    }

    messages.push({
      id: msg.id,
      guid: msg.guid,
      text: msg.text,
      contact: msg.sender,
      subject: null,
      date: msg.date.toISOString(),
      isFromMe: msg.isFromMe,
      isRead: msg.isRead,
      isSent: msg.isFromMe, // If in database, it was sent
      isDelivered: msg.isFromMe, // If in database, it was delivered
      hasAttachments: msg.attachments.length > 0,
      attachments,
      service: msg.service,
      chatId: msg.chatId,
      chatName: null,
    })
  }

  return messages
}
