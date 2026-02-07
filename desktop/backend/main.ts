import { app } from 'electron'
// ATTENTION import logger before any other local modules. It calls
// app.setName() which must happen before electron-log and electron-store
// initialize, otherwise data gets written to the wrong folder.
import { createLogger } from './lib/logger'
import { registerIpcHandlers } from './ipc'
import { startAllServices, stopAllServices } from './services'
import { getDeviceSecret, store } from './store'
import { destroyTray, initTray } from './tray'
import {
  createSettingsWindow,
  getMainWindow,
  showMainWindow,
} from './windows/settings'
import { startMcpServer, stopMcpServer } from './local-mcp'

const log = createLogger('app')

log.info('App version:', app.isPackaged ? app.getVersion() : '(not available)')

//
//
//
//
//

// // Wake test heartbeat logger - writes every second to ~/contexter-wake-test.log
// const WAKE_TEST_LOG = join(
//   homedir(),
//   app.isPackaged ? 'contexter-wake.log' : 'contexter-wake-test.log',
// )
// let heartbeatInterval: NodeJS.Timeout | null = null
//
// function formatTimestamp() {
//   const d = new Date()
//   const pad = (n: number) => n.toString().padStart(2, '0')
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
// }
//
// function startHeartbeat() {
//   const log = (msg: string) => {
//     const line = `${formatTimestamp()} | ${msg}\n`
//     appendFileSync(WAKE_TEST_LOG, line)
//   }
//
//   log('=== APP STARTED ===')
//
//   heartbeatInterval = setInterval(() => {
//     log('heartbeat')
//   }, 1000)
// }
//
// function stopHeartbeat() {
//   if (heartbeatInterval) {
//     clearInterval(heartbeatInterval)
//     const line = `${formatTimestamp()} | === APP STOPPED ===\n`
//     appendFileSync(WAKE_TEST_LOG, line)
//   }
// }

app.setAboutPanelOptions({
  applicationName: `Vaulty ${app.isPackaged ? '' : '(dev)'}`,
  copyright: 'Copyright © 2025',
  version: app.getVersion(),
})

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  log.info('Another instance is already running. Quitting.')
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  log.warn('second-instance fired')

  // Someone tried to run a second instance, focus our window instead
  const win = getMainWindow()
  if (!win) {
    createSettingsWindow()
    return
  }
  if (win.isMinimized()) {
    win.restore()
  }
  win.show()
  win.focus()
})

function needsConfiguration(): boolean {
  const deviceSecret = getDeviceSecret()
  const serverUrl = store.get('serverUrl')
  return !deviceSecret || !serverUrl
}

// Prevent multiple initialization
let isInitialized = false

app.whenReady().then(async () => {
  if (isInitialized) {
    log.info('App already initialized, skipping...')
    return
  }

  isInitialized = true

  // Hide dock initially - it will show when settings window opens
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  registerIpcHandlers()
  initTray()

  // Show settings window for onboarding or if configuration is needed
  const onboardingCompleted = store.get('onboardingCompleted')
  if (!onboardingCompleted || needsConfiguration()) {
    createSettingsWindow()
  }

  await startAllServices()

  // Start local MCP server if enabled
  const mcpConfig = store.get('mcpServer')
  if (mcpConfig.enabled) {
    const mcpPort = await startMcpServer(mcpConfig.port)
    log.info(`MCP server started on port ${mcpPort}`)
  } else {
    log.info('MCP server disabled')
  }

  // Start wake test heartbeat logger
  // startHeartbeat()

  log.info('App initialized')

  // app.on('activate', () => {
  //   // On macOS, when the dock icon is clicked, show the library window
  //   if (!libraryWindow) {
  //     createLibraryWindow()
  //     return
  //   }
  //   if (libraryWindow.isMinimized()) {
  //     libraryWindow.restore()
  //   }
  //   libraryWindow.show()
  //   libraryWindow.focus()
  // })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running even when all windows are closed
  // The tray will remain available
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS, when the dock icon is clicked, show the main window
  showMainWindow()
})

app.on('before-quit', () => {
  // stopHeartbeat()
  stopMcpServer()
  stopAllServices()
  destroyTray()
})
