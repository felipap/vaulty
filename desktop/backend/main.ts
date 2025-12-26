import { app } from 'electron'
import { createMainWindow, getMainWindow } from './windows/settings'
import { initTray, destroyTray } from './tray'
import { startAllServices, stopAllServices } from './services'
import { registerIpcHandlers } from './ipc'

app.setAboutPanelOptions({
  applicationName: `Contexter ${app.isPackaged ? '' : '(dev)'}`,
  copyright: 'Copyright © 2025',
  version: app.getVersion(),
})

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting.')
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  console.warn('second-instance fired')

  // Someone tried to run a second instance, focus our window instead
  const win = getMainWindow()
  if (!win) {
    createMainWindow()
    return
  }
  if (win.isMinimized()) {
    win.restore()
  }
  win.show()
  win.focus()
})

// Prevent multiple initialization
let isInitialized = false

app.whenReady().then(async () => {
  if (isInitialized) {
    console.log('App already initialized, skipping...')
    return
  }

  isInitialized = true
  registerIpcHandlers()
  createMainWindow()
  initTray()
  await startAllServices()

  console.log('App initialized')

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
  const win = getMainWindow()
  if (!win) {
    createMainWindow()
    return
  }
  if (win.isMinimized()) {
    win.restore()
  }
  win.show()
  win.focus()
})

app.on('before-quit', () => {
  stopAllServices()
  destroyTray()
})
