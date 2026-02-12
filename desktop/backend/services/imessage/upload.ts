import { apiRequest } from '../../lib/contexter-api'
import {
  encryptText,
  encryptBinaryToString,
  computeSearchIndex,
} from '../../lib/encryption'
import { normalizeContactForSearch } from '../../lib/search-index-utils'
import { type Message, type Attachment } from '../../sources/imessage'
import { getDeviceId, getEncryptionKey } from '../../store'

function encryptAttachment(
  attachment: Attachment,
  encryptionKey: string,
): Attachment {
  if (!attachment.dataBase64) {
    return attachment
  }
  const buffer = Buffer.from(attachment.dataBase64, 'base64')
  return {
    ...attachment,
    dataBase64: encryptBinaryToString(buffer, encryptionKey),
  }
}

function encryptMessages(
  messages: Message[],
  encryptionKey: string,
): Message[] {
  return messages.map((msg) => ({
    ...msg,
    text: msg.text ? encryptText(msg.text, encryptionKey) : msg.text,
    contact: encryptText(msg.contact, encryptionKey),
    contactIndex: computeSearchIndex(
      normalizeContactForSearch(msg.contact),
      encryptionKey,
    ),
    attachments: msg.attachments.map((att) =>
      encryptAttachment(att, encryptionKey),
    ),
  }))
}

export async function uploadMessages(
  messages: Message[],
): Promise<{ error: string } | {}> {
  if (messages.length === 0) {
    return {}
  }

  const encryptionKey = getEncryptionKey()
  if (!encryptionKey) {
    return { error: 'Encryption key not set' }
  }
  const messagesToUpload = encryptMessages(messages, encryptionKey)

  const res = await apiRequest({
    path: '/api/imessages',
    body: {
      messages: messagesToUpload,
      syncTime: new Date().toISOString(),
      deviceId: getDeviceId(),
      messageCount: messages.length,
    },
  })
  if ('error' in res) {
    console.log('apiRequest to /api/imessages failed:', res.error)
    return { error: res.error }
  }

  console.log(`Uploaded ${messages.length} messages successfully`)
  return {}
}
