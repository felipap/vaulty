export interface ApiRequestLog {
  id: string
  timestamp: number
  method: string
  url: string
  isError: boolean
  status?: number
  duration: number
  text?: string
}

export interface ServiceConfig {
  enabled: boolean
  intervalMinutes: number
}

export interface IMessageExportConfig extends ServiceConfig {
  includeAttachments: boolean
}

export interface UnipileWhatsappConfig extends ServiceConfig {
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

export interface ElectronAPI {
  platform: string

  // Request logs
  getRequestLogs: () => Promise<ApiRequestLog[]>
  clearRequestLogs: () => Promise<void>

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
  setIMessageExportConfig: (config: Partial<IMessageExportConfig>) => Promise<void>

  // Contacts service
  getContactsSyncConfig: () => Promise<ServiceConfig>
  setContactsSyncConfig: (config: Partial<ServiceConfig>) => Promise<void>

  // Unipile WhatsApp service
  getUnipileWhatsappConfig: () => Promise<UnipileWhatsappConfig>
  setUnipileWhatsappConfig: (config: Partial<UnipileWhatsappConfig>) => Promise<void>

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
}
