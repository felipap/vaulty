// WhatsApp Web.js headless browser implementation
// Uses Puppeteer to run WhatsApp Web and sync messages
//
// Requires: npm install whatsapp-web.js qrcode-terminal
//
// Authentication flow:
// 1. On first run, displays QR code in terminal
// 2. User scans with WhatsApp on phone
// 3. Session is persisted locally in .wwebjs_auth folder

import { EventEmitter } from 'events'

// Types for whatsapp-web.js
// We define these here to avoid import issues before the package is installed

export type WhatsAppHeadlessMessage = {
  id: string
  chatId: string
  chatName: string | null
  text: string | null
  senderNumber: string | null
  senderName: string | null
  timestamp: string
  isFromMe: boolean
  hasMedia: boolean
  mediaUrl: string | null
}

export type WhatsAppHeadlessChat = {
  id: string
  name: string
  isGroup: boolean
  unreadCount: number
}

export type AuthState = 'disconnected' | 'qr' | 'authenticated' | 'ready'

export type WhatsAppHeadlessEvents = {
  qr: (qrCode: string) => void
  authenticated: () => void
  ready: () => void
  disconnected: (reason: string) => void
  message: (message: WhatsAppHeadlessMessage) => void
  error: (error: Error) => void
}

// This is a wrapper class that will use whatsapp-web.js when available
// The actual implementation requires the package to be installed
export class WhatsAppHeadlessClient extends EventEmitter {
  private client: unknown = null
  private _authState: AuthState = 'disconnected'
  private dataPath: string

  constructor(options: { dataPath?: string } = {}) {
    super()
    // Default session storage location
    this.dataPath =
      options.dataPath ??
      `${process.env.HOME}/.contexter/whatsapp-headless-session`
  }

  get authState(): AuthState {
    return this._authState
  }

  async initialize(): Promise<void> {
    // Dynamic import since the package may not be installed
    let Client: unknown
    let LocalAuth: unknown

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const wwjs = require('whatsapp-web.js')
      Client = wwjs.Client
      LocalAuth = wwjs.LocalAuth
    } catch {
      throw new Error(
        'whatsapp-web.js is not installed. Run: npm install whatsapp-web.js qrcode-terminal',
      )
    }

    // Type assertion for the dynamic import
    const ClientClass = Client as new (options: {
      authStrategy: unknown
      puppeteer?: { headless?: boolean; args?: string[] }
    }) => WhatsAppWebClient

    const LocalAuthClass = LocalAuth as new (options: {
      dataPath: string
    }) => unknown

    this.client = new ClientClass({
      authStrategy: new LocalAuthClass({ dataPath: this.dataPath }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    })

    const client = this.client as WhatsAppWebClient

    client.on('qr', (qr: string) => {
      this._authState = 'qr'
      this.emit('qr', qr)
    })

    client.on('authenticated', () => {
      this._authState = 'authenticated'
      this.emit('authenticated')
    })

    client.on('ready', () => {
      this._authState = 'ready'
      this.emit('ready')
    })

    client.on('disconnected', (reason: string) => {
      this._authState = 'disconnected'
      this.emit('disconnected', reason)
    })

    client.on('message', (msg: WebJsMessage) => {
      this.emit('message', this.convertMessage(msg))
    })

    await client.initialize()
  }

  private convertMessage(msg: WebJsMessage): WhatsAppHeadlessMessage {
    return {
      id: msg.id._serialized,
      chatId: msg.from,
      chatName: null, // Would need to fetch from chat
      text: msg.body,
      senderNumber: msg.author ?? msg.from,
      senderName: msg._data?.notifyName ?? null,
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
      isFromMe: msg.fromMe,
      hasMedia: msg.hasMedia,
      mediaUrl: null, // Would need to download
    }
  }

  async getChats(): Promise<WhatsAppHeadlessChat[]> {
    if (!this.client || this._authState !== 'ready') {
      throw new Error('Client not ready')
    }

    const client = this.client as WhatsAppWebClient
    const chats = await client.getChats()

    return chats.map((chat: WebJsChat) => ({
      id: chat.id._serialized,
      name: chat.name,
      isGroup: chat.isGroup,
      unreadCount: chat.unreadCount,
    }))
  }

  async getMessagesFromChat(
    chatId: string,
    limit = 50,
  ): Promise<WhatsAppHeadlessMessage[]> {
    if (!this.client || this._authState !== 'ready') {
      throw new Error('Client not ready')
    }

    const client = this.client as WhatsAppWebClient
    const chat = await client.getChatById(chatId)
    const messages = await chat.fetchMessages({ limit })

    return messages.map((msg: WebJsMessage): WhatsAppHeadlessMessage => ({
      id: msg.id._serialized,
      chatId: chatId,
      chatName: chat.name,
      text: msg.body,
      senderNumber: msg.author ?? msg.from,
      senderName: msg._data?.notifyName ?? null,
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
      isFromMe: msg.fromMe,
      hasMedia: msg.hasMedia,
      mediaUrl: null,
    }))
  }

  async destroy(): Promise<void> {
    if (this.client) {
      const client = this.client as WhatsAppWebClient
      await client.destroy()
      this.client = null
      this._authState = 'disconnected'
    }
  }
}

// Internal types for whatsapp-web.js objects
type WebJsMessage = {
  id: { _serialized: string }
  from: string
  body: string
  author?: string
  timestamp: number
  fromMe: boolean
  hasMedia: boolean
  _data?: { notifyName?: string }
}

type WebJsChat = {
  id: { _serialized: string }
  name: string
  isGroup: boolean
  unreadCount: number
  fetchMessages: (options: { limit: number }) => Promise<WebJsMessage[]>
}

type WhatsAppWebClient = {
  on: (event: string, callback: (...args: unknown[]) => void) => void
  initialize: () => Promise<void>
  getChats: () => Promise<WebJsChat[]>
  getChatById: (chatId: string) => Promise<WebJsChat>
  destroy: () => Promise<void>
}

// Helper to display QR code in terminal (for setup)
export function displayQrCode(qrCode: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const qrcodeTerminal = require('qrcode-terminal') as {
      generate: (qr: string, options: { small: boolean }) => void
    }
    qrcodeTerminal.generate(qrCode, { small: true })
  } catch {
    // Fallback if qrcode-terminal not installed
    console.log('Scan this QR code with WhatsApp:')
    console.log(qrCode)
  }
}
