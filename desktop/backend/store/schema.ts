import { randomUUID } from 'crypto'

export type SyncLogSource =
  | 'screenshots'
  | 'imessage'
  | 'contacts'
  | 'whatsapp-sqlite'
  | 'whatsapp-unipile'

export type SyncLog = {
  id: string
  timestamp: number
  source: SyncLogSource
  status: 'success' | 'error'
  errorMessage?: string
  duration: number
}

export type StoreSchema = {
  deviceId: string | null
  deviceSecret: string | null
  encryptionKey: string | null
  serverUrl: string | null
  mcpServer: {
    enabled: boolean
    port: number
  }
  screenCapture: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
  }
  imessageExport: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
    includeAttachments: boolean
    lastExportedMessageDate: string | null
  }
  contactsSync: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
  }
  whatsappSqlite: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
    lastExportedMessageDate: string | null
    ignoredChatIds: string[]
  }
  whatsappUnipile: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
    apiBaseUrl: string | null
    apiToken: string | null
    accountId: string | null
  }
  syncLogs: SyncLog[]
}

export const DEFAULT_STATE: StoreSchema = {
  deviceId: randomUUID(),
  deviceSecret: null,
  encryptionKey: null,
  serverUrl: null,
  mcpServer: {
    enabled: false,
    port: 19513,
  },
  screenCapture: {
    enabled: false,
    intervalMinutes: 5,
    nextSyncAfter: null,
  },
  imessageExport: {
    enabled: false,
    intervalMinutes: 5,
    includeAttachments: true,
    nextSyncAfter: null,
    lastExportedMessageDate: null,
  },
  contactsSync: {
    enabled: false,
    intervalMinutes: 60,
    nextSyncAfter: null,
  },
  whatsappSqlite: {
    enabled: false,
    intervalMinutes: 5,
    nextSyncAfter: null,
    lastExportedMessageDate: null,
    ignoredChatIds: [],
  },
  whatsappUnipile: {
    enabled: false,
    intervalMinutes: 5,
    nextSyncAfter: null,
    apiBaseUrl: null,
    apiToken: null,
    accountId: null,
  },
  syncLogs: [],
}
