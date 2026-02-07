import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared-types'

const api = {
  platform: process.platform,

  // Onboarding
  getOnboardingCompleted: () => ipcRenderer.invoke('get-onboarding-completed'),
  setOnboardingCompleted: (completed: boolean) =>
    ipcRenderer.invoke('set-onboarding-completed', completed),

  // Sync logs
  getSyncLogs: () => ipcRenderer.invoke('get-sync-logs'),
  clearSyncLogs: () => ipcRenderer.invoke('clear-sync-logs'),

  // Server connection
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url: string) => ipcRenderer.invoke('set-server-url', url),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getDeviceSecret: () => ipcRenderer.invoke('get-device-secret'),
  setDeviceSecret: (secret: string) =>
    ipcRenderer.invoke('set-device-secret', secret),
  getEncryptionKey: () => ipcRenderer.invoke('get-encryption-key'),
  setEncryptionKey: (key: string) =>
    ipcRenderer.invoke('set-encryption-key', key),

  // Screenshots service
  getScreenCaptureConfig: () => ipcRenderer.invoke('get-screen-capture-config'),
  setScreenCaptureConfig: (config: {
    enabled?: boolean
    intervalMinutes?: number
  }) => ipcRenderer.invoke('set-screen-capture-config', config),

  // iMessage service
  getIMessageExportConfig: () =>
    ipcRenderer.invoke('get-imessage-export-config'),
  setIMessageExportConfig: (config: {
    enabled?: boolean
    intervalMinutes?: number
    includeAttachments?: boolean
  }) => ipcRenderer.invoke('set-imessage-export-config', config),

  // Contacts service
  getContactsSyncConfig: () => ipcRenderer.invoke('get-contacts-sync-config'),
  setContactsSyncConfig: (config: {
    enabled?: boolean
    intervalMinutes?: number
  }) => ipcRenderer.invoke('set-contacts-sync-config', config),

  // WhatsApp SQLite service
  getWhatsappSqliteConfig: () =>
    ipcRenderer.invoke('get-whatsapp-sqlite-config'),
  setWhatsappSqliteConfig: (config: {
    enabled?: boolean
    intervalMinutes?: number
  }) => ipcRenderer.invoke('set-whatsapp-sqlite-config', config),

  // WhatsApp Unipile service
  getWhatsappUnipileConfig: () =>
    ipcRenderer.invoke('get-whatsapp-unipile-config'),
  setWhatsappUnipileConfig: (config: {
    enabled?: boolean
    intervalMinutes?: number
    apiBaseUrl?: string
    apiToken?: string
    accountId?: string
  }) => ipcRenderer.invoke('set-whatsapp-unipile-config', config),

  // Services status
  getServicesStatus: () => ipcRenderer.invoke('get-services-status'),
  runServiceNow: (name: string) => ipcRenderer.invoke('run-service-now', name),

  // Permissions
  checkFullDiskAccess: () => ipcRenderer.invoke('check-full-disk-access'),
  openFullDiskAccessSettings: () =>
    ipcRenderer.invoke('open-full-disk-access-settings'),
  checkScreenRecordingAccess: () =>
    ipcRenderer.invoke('check-screen-recording-access'),
  openScreenRecordingSettings: () =>
    ipcRenderer.invoke('open-screen-recording-settings'),

  // iMessage backfill
  startIMessageBackfill: (days: number) =>
    ipcRenderer.invoke('start-imessage-backfill', days),
  cancelIMessageBackfill: () => ipcRenderer.invoke('cancel-imessage-backfill'),
  getIMessageBackfillProgress: () =>
    ipcRenderer.invoke('get-imessage-backfill-progress'),

  // WhatsApp backfill
  startWhatsappBackfill: (days: number) =>
    ipcRenderer.invoke('start-whatsapp-backfill', days),
  cancelWhatsappBackfill: () => ipcRenderer.invoke('cancel-whatsapp-backfill'),
  getWhatsappBackfillProgress: () =>
    ipcRenderer.invoke('get-whatsapp-backfill-progress'),

  // App settings
  getOpenAtLogin: () => ipcRenderer.invoke('get-open-at-login'),
  setOpenAtLogin: (enabled: boolean) =>
    ipcRenderer.invoke('set-open-at-login', enabled),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // MCP Server
  getMcpServerConfig: () => ipcRenderer.invoke('get-mcp-server-config'),
  setMcpServerConfig: (config: { enabled?: boolean; port?: number }) =>
    ipcRenderer.invoke('set-mcp-server-config', config),
  getMcpServerStatus: () => ipcRenderer.invoke('get-mcp-server-status'),
  startMcpServer: () => ipcRenderer.invoke('start-mcp-server'),
  stopMcpServer: () => ipcRenderer.invoke('stop-mcp-server'),
  // Utility
  openUrl: (url: string) => ipcRenderer.invoke('open-url', url),
} satisfies ElectronAPI

contextBridge.exposeInMainWorld('electron', api)
