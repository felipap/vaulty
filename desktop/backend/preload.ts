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

  // Generic service config
  getServiceConfig: (key: string) =>
    ipcRenderer.invoke('get-service-config', key),
  setServiceConfig: (key: string, config: Record<string, unknown>) =>
    ipcRenderer.invoke('set-service-config', key, config),

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

  // Utility
  openUrl: (url: string) => ipcRenderer.invoke('open-url', url),
} satisfies ElectronAPI

contextBridge.exposeInMainWorld('electron', api)
