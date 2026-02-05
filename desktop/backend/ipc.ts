import { ipcMain, shell, systemPreferences, app } from 'electron'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { SERVICES, getService } from './services'
import { imessageBackfill } from './services/imessage'
import { whatsappBackfill } from './services/whatsapp'
import { getMcpServerPort, startMcpServer, stopMcpServer } from './local-mcp'
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

export function registerIpcHandlers(): void {
  ipcMain.handle('get-sync-logs', () => {
    return getSyncLogs()
  })

  ipcMain.handle('clear-sync-logs', () => {
    clearSyncLogs()
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

  ipcMain.handle('get-whatsapp-sqlite-config', () => {
    return store.get('whatsappSqlite')
  })

  ipcMain.handle(
    'set-whatsapp-sqlite-config',
    (_event, config: { enabled?: boolean; intervalMinutes?: number }) => {
      const current = store.get('whatsappSqlite')
      store.set('whatsappSqlite', { ...current, ...config })
      getService('whatsapp-sqlite')?.restart()
    },
  )

  ipcMain.handle('get-whatsapp-unipile-config', () => {
    return store.get('whatsappUnipile')
  })

  ipcMain.handle(
    'set-whatsapp-unipile-config',
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
      const current = store.get('whatsappUnipile')
      store.set('whatsappUnipile', { ...current, ...config })
      getService('whatsapp-unipile')?.restart()
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

  // MCP Server
  ipcMain.handle('get-mcp-server-config', () => {
    return store.get('mcpServer')
  })

  ipcMain.handle(
    'set-mcp-server-config',
    async (_event, config: { enabled?: boolean; port?: number }) => {
      const current = store.get('mcpServer')
      const updated = { ...current, ...config }
      store.set('mcpServer', updated)

      // Start or stop based on enabled state
      if (config.enabled !== undefined) {
        if (config.enabled) {
          await startMcpServer(updated.port)
        } else {
          stopMcpServer()
        }
      }
    },
  )

  ipcMain.handle('get-mcp-server-status', () => {
    const port = getMcpServerPort()
    return {
      running: port !== null,
      port,
    }
  })

  ipcMain.handle('start-mcp-server', async () => {
    const config = store.get('mcpServer')
    return await startMcpServer(config.port)
  })

  ipcMain.handle('stop-mcp-server', () => {
    stopMcpServer()
  })
}
