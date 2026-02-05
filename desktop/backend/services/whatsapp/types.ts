// Shared WhatsApp types used across all sources (SQLite, Unipile, etc.)

export type WhatsAppMessage = {
  id: string
  chatId: string
  chatName: string | null
  text: string | null
  sender: string | null
  senderName: string | null
  senderPhoneNumber: string | null
  timestamp: string
  isFromMe: boolean
  messageType: number
  hasMedia: boolean
  attachments: WhatsAppAttachment[]
}

export type WhatsAppAttachment = {
  id: string
  filename: string | null
  mimeType: string | null
  size: number | null
  localPath: string | null
  dataBase64: string | null
}

export type WhatsAppSource = 'sqlite' | 'unipile'
