import { BrowserWindow, app } from 'electron'
import path from 'node:path'
import { findIconPath } from '../lib/utils'

const isDev = !app.isPackaged

let settingsWindow: BrowserWindow | null = null

function showDock(): void {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show()
  }
}

export function createSettingsWindow(): BrowserWindow {
  showDock()

  const iconPath = findIconPath()

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    minWidth: 500,
    minHeight: 600,
    maxWidth: 500,
    maxHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
    },
    show: true,
    icon: iconPath || undefined,
  })

  if (iconPath) {
    app.dock?.setIcon(iconPath)
    settingsWindow.setIcon(iconPath)
  }

  if (isDev) {
    settingsWindow.loadURL('http://localhost:4001')
    // mainWindow.webContents.openDevTools()
  } else {
    const settingsPath = path.join(
      __dirname,
      '..',
      '..',
      'windows',
      'settings',
      'index.html',
    )
    settingsWindow.loadFile(settingsPath)
  }

  // Clean up reference when window is closed
  settingsWindow.on('closed', () => {
    settingsWindow = null
    if (process.platform === 'darwin' && app.dock) {
      app.dock.hide()
    }
  })

  return settingsWindow
}

export function getMainWindow(): BrowserWindow | null {
  return settingsWindow
}

export function showMainWindow(): void {
  if (settingsWindow) {
    settingsWindow.show()
    settingsWindow.focus()
  } else {
    createSettingsWindow()
  }
}
