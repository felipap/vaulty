import { apiRequest } from '../../lib/contexter-api'
import { encryptText } from '../../lib/encryption'
import { getDeviceId, getEncryptionKey } from '../../store'
import type { WhatsAppMessage, WhatsAppSource } from './types'

function encryptMessages(
  messages: WhatsAppMessage[],
  encryptionKey: string,
): WhatsAppMessage[] {
  return messages.map((msg) => ({
    ...msg,
    text: msg.text ? encryptText(msg.text, encryptionKey) : msg.text,
    chatName: msg.chatName
      ? encryptText(msg.chatName, encryptionKey)
      : msg.chatName,
    senderName: msg.senderName
      ? encryptText(msg.senderName, encryptionKey)
      : msg.senderName,
    senderPhoneNumber: msg.senderPhoneNumber
      ? encryptText(msg.senderPhoneNumber, encryptionKey)
      : msg.senderPhoneNumber,
  }))
}

export async function uploadWhatsAppMessages(
  messages: WhatsAppMessage[],
  source: WhatsAppSource,
): Promise<{ error: string } | object> {
  if (messages.length === 0) {
    return {}
  }

  const encryptionKey = getEncryptionKey()
  const messagesToUpload = encryptionKey
    ? encryptMessages(messages, encryptionKey)
    : messages

  const res = await apiRequest({
    path: '/api/whatsapp/messages',
    body: {
      messages: messagesToUpload,
      source,
      syncTime: new Date().toISOString(),
      deviceId: getDeviceId(),
      messageCount: messages.length,
    },
  })

  if ('error' in res) {
    return { error: res.error }
  }

  console.log(
    `[whatsapp-${source}] Uploaded ${messages.length} messages successfully`,
  )
  return {}
}
