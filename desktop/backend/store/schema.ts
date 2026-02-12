import { randomUUID } from 'crypto'

export type SyncLogSource =
  | 'screenshots'
  | 'imessage'
  | 'icontacts'
  | 'whatsapp-sqlite'
  | 'macos-stickies'

export type SyncLog = {
  id: string
  timestamp: number
  source: SyncLogSource
  status: 'success' | 'error'
  errorMessage?: string
  duration: number
}

export type StoreSchema = {
  onboardingCompleted: boolean
  deviceId: string | null
  deviceSecret: string | null
  encryptionKey: string | null
  serverUrl: string | null
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
  icontactsSync: {
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
  macosStickiesSync: {
    enabled: boolean
    intervalMinutes: number
    nextSyncAfter: string | null
  }
  syncLogs: SyncLog[]
}

export const DEFAULT_STATE: StoreSchema = {
  onboardingCompleted: false,
  deviceId: randomUUID(),
  deviceSecret: null,
  encryptionKey: null,
  serverUrl: null,
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
  icontactsSync: {
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
  macosStickiesSync: {
    enabled: false,
    intervalMinutes: 60,
    nextSyncAfter: null,
  },
  syncLogs: [],
}
