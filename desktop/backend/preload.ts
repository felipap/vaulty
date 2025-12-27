import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared-types'

const api = {
  platform: process.platform,

  // Request logs
  getRequestLogs: () => ipcRenderer.invoke('get-request-logs'),
  clearRequestLogs: () => ipcRenderer.invoke('clear-request-logs'),

  // Server connection
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url: string) => ipcRenderer.invoke('set-server-url', url),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getDeviceSecret: () => ipcRenderer.invoke('get-device-secret'),
  setDeviceSecret: (secret: string) =>
    ipcRenderer.invoke('set-device-secret', secret),

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
  }) => ipcRenderer.invoke('set-imessage-export-config', config),

  // Contacts service
  getContactsSyncConfig: () => ipcRenderer.invoke('get-contacts-sync-config'),
  setContactsSyncConfig: (config: {
    enabled?: boolean
    intervalMinutes?: number
  }) => ipcRenderer.invoke('set-contacts-sync-config', config),

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
} satisfies ElectronAPI

contextBridge.exposeInMainWorld('electron', api)
