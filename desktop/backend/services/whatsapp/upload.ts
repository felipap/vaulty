import {
  normalizeStringForSearch,
  normalizePhoneForSearch,
} from '../../lib/search-index-utils'
import { getDeviceId } from '../../store'
import { log } from './index'
import type { WhatsAppMessage } from './types'
import { encryptAndUpload, type SyncConfig } from '../upload-utils'

const FIELD_CONFIG: SyncConfig = {
  encryptedFields: ['text', 'chatName', 'senderName', 'senderPhoneNumber'],
  searchIndexes: [
    {
      sourceField: 'chatName',
      indexField: 'chatNameIndex',
      normalize: normalizeStringForSearch,
    },
    {
      sourceField: 'senderName',
      indexField: 'senderNameIndex',
      normalize: normalizeStringForSearch,
    },
    {
      sourceField: 'senderPhoneNumber',
      indexField: 'senderPhoneNumberIndex',
      normalize: normalizePhoneForSearch,
    },
  ],
}

export async function uploadWhatsAppMessages(
  messages: WhatsAppMessage[],
  source: 'sqlite',
): Promise<{ error: string } | object> {
  const result = await encryptAndUpload({
    items: messages,
    config: FIELD_CONFIG,
    apiPath: '/api/whatsapp/messages',
    bodyKey: 'messages',
    extraBody: {
      source,
      syncTime: new Date().toISOString(),
      deviceId: getDeviceId(),
      messageCount: messages.length,
    },
  })

  if ('error' in result) {
    return { error: result.error }
  }

  log.info(`Uploaded ${result.count} messages successfully`)
  return {}
}
