import { IMessageSDK } from '@photon-ai/imessage-kit'
import { readAttachmentAsBase64 } from './images'

export type Attachment = {
  id: string
  filename: string
  mimeType: string
  path: string
  size: number
  isImage: boolean
  createdAt: string
  dataBase64?: string
  error?: string
}

export type Message = {
  id: string
  guid: string
  text: string | null
  contact: string
  contactIndex?: string
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

// Each SDK instance keeps a database connection open, so we reuse instances.
export function createIMessageSDK(): IMessageSDK {
  return new IMessageSDK({ debug: false })
}

type FetchOptions = {
  includeAttachments?: boolean
  // NOTE: limit is intentionally not exposed here. See comment below.
}

// PAGINATION NOTES (tested Jan 2026):
// - Messages are returned in DESCENDING order (newest first)
// - With a limit, you get the N newest messages since the date
// - The SDK doesn't provide offset/cursor pagination
// - To get ALL messages in a date range, we must either:
//   1. Not use a limit (load all into memory)
//   2. Paginate by tracking the oldest date seen and re-querying
// - For now, we don't use a limit so we get all messages. This may need
//   revisiting if memory becomes an issue with large date ranges.
export async function fetchMessages(
  sdk: IMessageSDK,
  since: Date,
  options: FetchOptions = {},
): Promise<Message[]> {
  const { includeAttachments = true } = options

  const result = await sdk.getMessages({
    since,
    excludeOwnMessages: false,
    // No limit - we need all messages since the date, not just the newest N
  })

  const messages: Message[] = []

  for (const msg of result.messages) {
    const attachments: Attachment[] = []

    if (includeAttachments) {
      // Only process image attachments - skip videos and other large files
      const imageAttachments = msg.attachments.filter((att) => att.isImage)

      for (const att of imageAttachments) {
        const readResult = await readAttachmentAsBase64(att.path, att.isImage)

        // Skip attachments that couldn't be read (e.g., file deleted/moved)
        if (readResult.ok === false) {
          console.warn(
            `[imessage] Skipping attachment ${att.id} for message ${msg.id}: ${readResult.error}`,
          )
          continue
        }

        attachments.push({
          id: att.id,
          filename: att.filename,
          mimeType: 'image/jpeg', // All images are converted to JPEG
          path: att.path,
          size: att.size,
          isImage: true,
          createdAt: att.createdAt.toISOString(),
          dataBase64: readResult.data,
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
