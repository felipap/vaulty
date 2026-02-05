// Unipile WhatsApp message fetcher
// API Docs: https://developer.unipile.com/reference

export type UnipileConfig = {
  apiBaseUrl: string
  apiToken: string
  accountId: string
}

export type UnipileMessage = {
  id: string
  chatId: string
  text: string | null
  sender: string
  senderName: string | null
  timestamp: string
  isFromMe: boolean
  attachments: UnipileAttachment[]
}

export type UnipileAttachment = {
  id: string
  filename: string
  mimeType: string
  size: number | null
  dataBase64?: string
}

type UnipileApiMessage = {
  id: string
  text?: string
  sender_id: string
  sender_name?: string
  timestamp: string
  is_sent_by_me?: boolean
  attachments?: Array<{
    id: string
    file_name?: string
    mime_type?: string
    size?: number
  }>
}

type UnipileApiResponse<T> = {
  items?: T[]
  object?: string
  cursor?: string
}

type UnipileChat = {
  id: string
  account_id: string
  name?: string
}

async function fetchFromUnipile<T>(
  config: UnipileConfig,
  path: string,
): Promise<T> {
  const url = `${config.apiBaseUrl}/api/v1${path}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-KEY': config.apiToken,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Unipile API error ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

export async function fetchChats(config: UnipileConfig): Promise<UnipileChat[]> {
  const response = await fetchFromUnipile<UnipileApiResponse<UnipileChat>>(
    config,
    `/chats?account_id=${config.accountId}`,
  )
  return response.items ?? []
}

export async function fetchChatMessages(
  config: UnipileConfig,
  chatId: string,
  since?: Date,
): Promise<UnipileMessage[]> {
  let path = `/chats/${chatId}/messages`
  if (since) {
    path += `?after=${since.toISOString()}`
  }

  const response = await fetchFromUnipile<UnipileApiResponse<UnipileApiMessage>>(
    config,
    path,
  )

  const apiMessages = response.items ?? []

  return apiMessages.map((msg) => ({
    id: msg.id,
    chatId,
    text: msg.text ?? null,
    sender: msg.sender_id,
    senderName: msg.sender_name ?? null,
    timestamp: msg.timestamp,
    isFromMe: msg.is_sent_by_me ?? false,
    attachments: (msg.attachments ?? []).map((att) => ({
      id: att.id,
      filename: att.file_name ?? 'unknown',
      mimeType: att.mime_type ?? 'application/octet-stream',
      size: att.size ?? null,
    })),
  }))
}

export async function fetchAllMessages(
  config: UnipileConfig,
  since?: Date,
): Promise<UnipileMessage[]> {
  const chats = await fetchChats(config)
  const allMessages: UnipileMessage[] = []

  for (const chat of chats) {
    const messages = await fetchChatMessages(config, chat.id, since)
    allMessages.push(...messages)
  }

  // Sort by timestamp ascending
  allMessages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  return allMessages
}
