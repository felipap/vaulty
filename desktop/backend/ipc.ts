import { ipcMain, shell, systemPreferences, app } from 'electron'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { ServiceConfigKey } from '../shared-types'
import { SERVICES, getService } from './services'
import { imessageBackfill } from './services/imessage'
import { whatsappBackfill } from './services/whatsapp'
import {
  store,
  getSyncLogs,
  clearSyncLogs,
  getDeviceId,
  getDeviceSecret,
  setDeviceSecret,
  getEncryptionKey,
  setEncryptionKey,
} from './store'

const CONFIG_KEY_TO_SERVICE: Record<ServiceConfigKey, string> = {
  screenCapture: 'screenshots',
  imessageExport: 'imessage',
  icontactsSync: 'icontacts',
  whatsappSqlite: 'whatsapp-sqlite',
  macosStickiesSync: 'macos-stickies',
  winStickyNotesSync: 'win-sticky-notes',
}

export function registerIpcHandlers(): void {
  // Onboarding
  ipcMain.handle('get-onboarding-completed', () => {
    return store.get('onboardingCompleted')
  })

  ipcMain.handle('set-onboarding-completed', (_event, completed: boolean) => {
    store.set('onboardingCompleted', completed)
  })

  ipcMain.handle('get-sync-logs', () => {
    return getSyncLogs()
  })

  ipcMain.handle('clear-sync-logs', () => {
    clearSyncLogs()
  })

  // Server connection
  ipcMain.handle('get-server-url', () => {
    return store.get('serverUrl')
  })

  ipcMain.handle('set-server-url', (_event, url: string) => {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    store.set('serverUrl', normalized)
  })

  ipcMain.handle('get-device-id', () => {
    return getDeviceId()
  })

  ipcMain.handle('get-device-secret', () => {
    return getDeviceSecret()
  })

  ipcMain.handle('set-device-secret', (_event, secret: string) => {
    setDeviceSecret(secret)
  })

  ipcMain.handle('get-encryption-key', () => {
    return getEncryptionKey()
  })

  ipcMain.handle('set-encryption-key', (_event, key: string) => {
    setEncryptionKey(key)
  })

  // Generic service config
  ipcMain.handle('get-service-config', (_event, configKey: ServiceConfigKey) => {
    return store.get(configKey)
  })

  ipcMain.handle(
    'set-service-config',
    (_event, configKey: ServiceConfigKey, config: Record<string, unknown>) => {
      const current = store.get(configKey)
      store.set(configKey, { ...current, ...config })
      const serviceName = CONFIG_KEY_TO_SERVICE[configKey]
      getService(serviceName)?.restart()
    },
  )

  // Services status
  ipcMain.handle('get-services-status', () => {
    return SERVICES.map((s) => ({
      name: s.name,
      isRunning: s.isRunning(),
      nextRunTime: s.getNextRunTime()?.toISOString() ?? null,
      timeUntilNextRun: s.getTimeUntilNextRun(),
    }))
  })

  ipcMain.handle('run-service-now', async (_event, name: string) => {
    const service = getService(name)
    if (service) {
      await service.runNow()
    }
  })

  // Permissions
  ipcMain.handle('check-full-disk-access', () => {
    const chatDbPath = path.join(os.homedir(), 'Library', 'Messages', 'chat.db')
    try {
      fs.accessSync(chatDbPath, fs.constants.R_OK)
      return { hasAccess: true }
    } catch {
      return { hasAccess: false }
    }
  })

  ipcMain.handle('open-full-disk-access-settings', () => {
    shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
    )
  })

  ipcMain.handle('check-screen-recording-access', () => {
    const status = systemPreferences.getMediaAccessStatus('screen')
    return { hasAccess: status === 'granted' }
  })

  ipcMain.handle('open-screen-recording-settings', () => {
    shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
    )
  })

  // iMessage backfill
  ipcMain.handle('start-imessage-backfill', async (_event, days: number) => {
    await imessageBackfill.run(days)
  })

  ipcMain.handle('cancel-imessage-backfill', () => {
    imessageBackfill.cancel()
  })

  ipcMain.handle('get-imessage-backfill-progress', () => {
    return imessageBackfill.getProgress()
  })

  // WhatsApp backfill
  ipcMain.handle('start-whatsapp-backfill', async (_event, days: number) => {
    await whatsappBackfill.run(days)
  })

  ipcMain.handle('cancel-whatsapp-backfill', () => {
    whatsappBackfill.cancel()
  })

  ipcMain.handle('get-whatsapp-backfill-progress', () => {
    return whatsappBackfill.getProgress()
  })

  // App settings
  ipcMain.handle('get-open-at-login', () => {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  })

  ipcMain.handle('set-open-at-login', (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // Utility
  ipcMain.handle('open-url', (_event, url: string) => {
    shell.openExternal(url)
  })
}
