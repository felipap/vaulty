import { catchAndComplain } from '../../lib/utils'
import {
  fetchAllMessages,
  type UnipileConfig,
  type UnipileMessage,
} from '../../sources/whatsapp-unipile'
import { store } from '../../store'
import { startAnimating } from '../../tray/animate'
import { createScheduledService } from '../scheduler'
import type { WhatsAppAttachment, WhatsAppMessage } from './types'
import { uploadWhatsAppMessages } from './upload'

function getUnipileConfig(): UnipileConfig | null {
  const config = store.get('whatsappUnipile')
  if (!config.apiBaseUrl || !config.apiToken || !config.accountId) {
    return null
  }
  return {
    apiBaseUrl: config.apiBaseUrl,
    apiToken: config.apiToken,
    accountId: config.accountId,
  }
}

function toWhatsAppMessage(msg: UnipileMessage): WhatsAppMessage {
  return {
    id: `unipile-${msg.id}`,
    chatId: msg.chatId,
    chatName: null,
    text: msg.text,
    sender: msg.sender,
    senderName: msg.senderName,
    timestamp: msg.timestamp,
    isFromMe: msg.isFromMe,
    hasMedia: msg.attachments.length > 0,
    attachments: msg.attachments.map(
      (att): WhatsAppAttachment => ({
        id: `unipile-${att.id}`,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        localPath: null,
        dataBase64: att.dataBase64 ?? null,
      }),
    ),
  }
}

let lastExportedMessageDate: Date | null = null

async function exportAndUpload(): Promise<void> {
  console.log('[whatsapp-unipile] Exporting messages...')

  const unipileConfig = getUnipileConfig()
  if (!unipileConfig) {
    throw new Error(
      'Unipile API not configured (missing apiBaseUrl, apiToken, or accountId)',
    )
  }

  const since =
    lastExportedMessageDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
  const unipileMessages = await fetchAllMessages(unipileConfig, since)

  if (unipileMessages.length === 0) {
    console.log('[whatsapp-unipile] No new messages to export')
    return
  }

  const messages = unipileMessages.map(toWhatsAppMessage)

  const latestTimestamp = messages.reduce(
    (max, msg) => (msg.timestamp > max ? msg.timestamp : max),
    messages[0].timestamp,
  )

  console.debug('[whatsapp-unipile] Found', messages.length, 'new messages')

  const stopAnimating = startAnimating('old')

  const res = await catchAndComplain(
    uploadWhatsAppMessages(messages, 'unipile'),
  )
  stopAnimating()

  if ('error' in res) {
    throw new Error(`uploadWhatsAppMessages failed: ${res.error}`)
  }

  lastExportedMessageDate = new Date(latestTimestamp)
}

export const whatsappUnipileService = createScheduledService({
  name: 'whatsapp-unipile',
  configKey: 'whatsappUnipile',
  onSync: exportAndUpload,
})
