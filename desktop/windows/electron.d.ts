export interface ApiRequestLog {
  id: string
  timestamp: number
  method: string
  path: string
  status: 'success' | 'error'
  statusCode?: number
  duration: number
  error?: string
}

export interface ServiceConfig {
  enabled: boolean
  intervalMinutes: number
}

export interface ServiceStatus {
  name: string
  isRunning: boolean
  nextRunTime: string | null
  timeUntilNextRun: number
}

export interface BackfillProgress {
  current: number
  total: number
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled'
  error?: string
}

interface ElectronAPI {
  platform: string

  // Request logs
  getRequestLogs: () => Promise<ApiRequestLog[]>
  clearRequestLogs: () => Promise<void>

  // Server connection
  getServerUrl: () => Promise<string>
  setServerUrl: (url: string) => Promise<void>
  getDeviceId: () => Promise<string>
  getDeviceSecret: () => Promise<string>
  setDeviceSecret: (secret: string) => Promise<void>

  // Screenshots service
  getScreenCaptureConfig: () => Promise<ServiceConfig>
  setScreenCaptureConfig: (config: Partial<ServiceConfig>) => Promise<void>

  // iMessage service
  getIMessageExportConfig: () => Promise<ServiceConfig>
  setIMessageExportConfig: (config: Partial<ServiceConfig>) => Promise<void>

  // Contacts service
  getContactsSyncConfig: () => Promise<ServiceConfig>
  setContactsSyncConfig: (config: Partial<ServiceConfig>) => Promise<void>

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

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
