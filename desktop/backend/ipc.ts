import { ipcMain, shell, systemPreferences } from 'electron'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { SERVICES, getService } from './services'
import { imessageBackfill } from './services/imessage'
import {
  store,
  getRequestLogs,
  clearRequestLogs,
  getDeviceId,
  getDeviceSecret,
  setDeviceSecret,
  getEncryptionKey,
  setEncryptionKey,
} from './store'

export function registerIpcHandlers(): void {
  ipcMain.handle('get-request-logs', () => {
    return getRequestLogs()
  })

  ipcMain.handle('clear-request-logs', () => {
    clearRequestLogs()
  })

  ipcMain.handle('get-screen-capture-config', () => {
    return store.get('screenCapture')
  })

  ipcMain.handle(
    'set-screen-capture-config',
    (_event, config: { enabled?: boolean; intervalMinutes?: number }) => {
      const current = store.get('screenCapture')
      store.set('screenCapture', { ...current, ...config })
      getService('screenshots')?.restart()
    },
  )

  ipcMain.handle('get-server-url', () => {
    return store.get('serverUrl')
  })

  ipcMain.handle('set-server-url', (_event, url: string) => {
    store.set('serverUrl', url)
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

  ipcMain.handle('get-imessage-export-config', () => {
    return store.get('imessageExport')
  })

  ipcMain.handle(
    'set-imessage-export-config',
    (
      _event,
      config: {
        enabled?: boolean
        intervalMinutes?: number
        includeAttachments?: boolean
      },
    ) => {
      const current = store.get('imessageExport')
      store.set('imessageExport', { ...current, ...config })
      getService('imessage')?.restart()
    },
  )

  ipcMain.handle('get-contacts-sync-config', () => {
    return store.get('contactsSync')
  })

  ipcMain.handle(
    'set-contacts-sync-config',
    (_event, config: { enabled?: boolean; intervalMinutes?: number }) => {
      const current = store.get('contactsSync')
      store.set('contactsSync', { ...current, ...config })
      getService('contacts')?.restart()
    },
  )

  ipcMain.handle('get-unipile-whatsapp-config', () => {
    return store.get('unipileWhatsapp')
  })

  ipcMain.handle(
    'set-unipile-whatsapp-config',
    (
      _event,
      config: {
        enabled?: boolean
        intervalMinutes?: number
        apiBaseUrl?: string
        apiToken?: string
        accountId?: string
      },
    ) => {
      const current = store.get('unipileWhatsapp')
      store.set('unipileWhatsapp', { ...current, ...config })
      getService('unipile-whatsapp')?.restart()
    },
  )

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
}
