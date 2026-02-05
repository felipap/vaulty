export type SyncLogSource =
  | 'screenshots'
  | 'imessage'
  | 'contacts'
  | 'whatsapp-sqlite'
  | 'whatsapp-unipile'

export interface SyncLog {
  id: string
  timestamp: number
  source: SyncLogSource
  status: 'success' | 'error'
  errorMessage?: string
  duration: number
}

export interface ServiceConfig {
  enabled: boolean
  intervalMinutes: number
}

export interface IMessageExportConfig extends ServiceConfig {
  includeAttachments: boolean
}

export interface WhatsappSqliteConfig extends ServiceConfig {
  lastExportedMessageDate: string | null
}

export interface WhatsappUnipileConfig extends ServiceConfig {
  apiBaseUrl: string | null
  apiToken: string | null
  accountId: string | null
}

export interface ServiceStatus {
  name: string
  isRunning: boolean
  nextRunTime: string | null
  timeUntilNextRun: number
}

export interface BackfillProgress {
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
  phase?: 'loading' | 'uploading'
  current: number
  total: number
  messageCount?: number
  error?: string
}

export interface McpServerConfig {
  enabled: boolean
  port: number
}

export interface McpServerStatus {
  running: boolean
  port: number | null
}

export interface ElectronAPI {
  platform: string

  // Sync logs
  getSyncLogs: () => Promise<SyncLog[]>
  clearSyncLogs: () => Promise<void>

  // Server connection
  getServerUrl: () => Promise<string | null>
  setServerUrl: (url: string) => Promise<void>
  getDeviceId: () => Promise<string>
  getDeviceSecret: () => Promise<string | null>
  setDeviceSecret: (secret: string) => Promise<void>
  getEncryptionKey: () => Promise<string | null>
  setEncryptionKey: (key: string) => Promise<void>

  // Screenshots service
  getScreenCaptureConfig: () => Promise<ServiceConfig>
  setScreenCaptureConfig: (config: Partial<ServiceConfig>) => Promise<void>

  // iMessage service
  getIMessageExportConfig: () => Promise<IMessageExportConfig>
  setIMessageExportConfig: (
    config: Partial<IMessageExportConfig>,
  ) => Promise<void>

  // Contacts service
  getContactsSyncConfig: () => Promise<ServiceConfig>
  setContactsSyncConfig: (config: Partial<ServiceConfig>) => Promise<void>

  // WhatsApp SQLite service
  getWhatsappSqliteConfig: () => Promise<WhatsappSqliteConfig>
  setWhatsappSqliteConfig: (
    config: Partial<WhatsappSqliteConfig>,
  ) => Promise<void>

  // WhatsApp Unipile service
  getWhatsappUnipileConfig: () => Promise<WhatsappUnipileConfig>
  setWhatsappUnipileConfig: (
    config: Partial<WhatsappUnipileConfig>,
  ) => Promise<void>

  // Services status
  getServicesStatus: () => Promise<ServiceStatus[]>
  runServiceNow: (name: string) => Promise<void>

  // Permissions
  checkFullDiskAccess: () => Promise<{ hasAccess: boolean }>
  openFullDiskAccessSettings: () => Promise<void>
  checkScreenRecordingAccess: () => Promise<{ hasAccess: boolean }>
  openScreenRecordingSettings: () => Promise<void>

  // iMessage backfill
  startIMessageBackfill: (days: number) => Promise<void>
  cancelIMessageBackfill: () => Promise<void>
  getIMessageBackfillProgress: () => Promise<BackfillProgress>

  // WhatsApp backfill
  startWhatsappBackfill: (days: number) => Promise<void>
  cancelWhatsappBackfill: () => Promise<void>
  getWhatsappBackfillProgress: () => Promise<BackfillProgress>

  // App settings
  getOpenAtLogin: () => Promise<boolean>
  setOpenAtLogin: (enabled: boolean) => Promise<void>
  getAppVersion: () => Promise<string>

  // MCP Server
  getMcpServerConfig: () => Promise<McpServerConfig>
  setMcpServerConfig: (config: Partial<McpServerConfig>) => Promise<void>
  getMcpServerStatus: () => Promise<McpServerStatus>
  startMcpServer: () => Promise<number>
  stopMcpServer: () => Promise<void>
}
