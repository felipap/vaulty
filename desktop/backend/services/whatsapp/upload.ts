import { apiRequest } from '../../lib/contexter-api'
import { computeSearchIndex, encryptText } from '../../lib/encryption'
import {
  normalizeChatNameForSearch,
  normalizePhoneForSearch,
} from '../../lib/search-index-utils'
import { getDeviceId, getEncryptionKey } from '../../store'
import type { WhatsAppMessage, WhatsAppSource } from './types'

type EncryptedWhatsAppMessage = WhatsAppMessage & {
  chatNameIndex?: string
  senderNameIndex?: string
  senderPhoneNumberIndex?: string
}

function encryptMessages(
  messages: WhatsAppMessage[],
  encryptionKey: string,
): EncryptedWhatsAppMessage[] {
  return messages.map((msg) => ({
    ...msg,
    text: msg.text ? encryptText(msg.text, encryptionKey) : msg.text,
    chatName: msg.chatName
      ? encryptText(msg.chatName, encryptionKey)
      : msg.chatName,
    chatNameIndex: msg.chatName
      ? computeSearchIndex(
          normalizeChatNameForSearch(msg.chatName),
          encryptionKey,
        )
      : undefined,
    senderName: msg.senderName
      ? encryptText(msg.senderName, encryptionKey)
      : msg.senderName,
    senderNameIndex: msg.senderName
      ? computeSearchIndex(
          normalizeChatNameForSearch(msg.senderName),
          encryptionKey,
        )
      : undefined,
    senderPhoneNumber: msg.senderPhoneNumber
      ? encryptText(msg.senderPhoneNumber, encryptionKey)
      : msg.senderPhoneNumber,
    senderPhoneNumberIndex: msg.senderPhoneNumber
      ? computeSearchIndex(
          normalizePhoneForSearch(msg.senderPhoneNumber),
          encryptionKey,
        )
      : undefined,
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
