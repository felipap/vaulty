export type WhatsappSqliteMessage = {
  id: string
  chatId: string
  chatName: string | null
  chatIsGroupChat: boolean
  text: string | null
  senderJid: string | null
  senderName: string | null
  senderPhoneNumber: string | null
  timestamp: string
  isFromMe: boolean
  messageType: number
  hasMedia: boolean
  mediaLocalPath: string | null
}

export type WhatsappSqliteChat = {
  id: string
  jid: string
  name: string | null
  lastMessageDate: string | null
  unreadCount: number
  isGroup: boolean
}
