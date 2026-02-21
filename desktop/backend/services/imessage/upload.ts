import { log } from './index'
import { encryptBinaryToString } from '../../lib/encryption'
import { normalizeContactForSearch } from '../../lib/search-index-utils'
import { type Message } from '../../sources/imessage'
import { getDeviceId } from '../../store'
import { encryptAndUpload, type SyncConfig } from '../upload-utils'

const FIELD_CONFIG: SyncConfig = {
  encryptedFields: ['text', 'contact'],
  searchIndexes: [
    {
      sourceField: 'contact',
      indexField: 'contactIndex',
      normalize: normalizeContactForSearch,
    },
  ],
}

function encryptAttachments(
  messages: Message[],
  encryptionKey: string,
): Message[] {
  return messages.map((msg) => ({
    ...msg,
    attachments: msg.attachments.map((att) => {
      if (!att.dataBase64) {
        return att
      }
      const buffer = Buffer.from(att.dataBase64, 'base64')
      return {
        ...att,
        dataBase64: encryptBinaryToString(buffer, encryptionKey),
      }
    }),
  }))
}

export async function uploadMessages(
  messages: Message[],
): Promise<{ error: string } | {}> {
  const result = await encryptAndUpload({
    items: messages,
    config: FIELD_CONFIG,
    apiPath: '/api/imessages',
    bodyKey: 'messages',
    extraBody: {
      syncTime: new Date().toISOString(),
      deviceId: getDeviceId(),
      messageCount: messages.length,
    },
    preprocess: encryptAttachments,
  })

  if ('error' in result) {
    log.error('Upload to /api/imessages failed:', result.error.slice(0, 1000))
    return { error: result.error }
  }

  log.info(`Uploaded ${result.count} messages successfully`)
  return {}
}
