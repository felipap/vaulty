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

type WindowOptions = {
  tab?: 'general' | 'logs'
  highlightSyncId?: string
}

function buildQueryString(options: WindowOptions): string {
  const params = new URLSearchParams()
  if (options.tab) {
    params.set('tab', options.tab)
  }
  if (options.highlightSyncId) {
    params.set('highlightSyncId', options.highlightSyncId)
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function createSettingsWindow(
  options: WindowOptions = {},
): BrowserWindow {
  showDock()

  const iconPath = findIconPath()

  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    maxWidth: 800,
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

  const queryString = buildQueryString(options)

  if (isDev) {
    settingsWindow.loadURL(`http://localhost:4001${queryString}`)
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
    settingsWindow.loadFile(settingsPath, {
      search: queryString.slice(1), // Remove the leading '?'
    })
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

export function showMainWindow(options: WindowOptions = {}): void {
  if (settingsWindow) {
    // If window exists, navigate to the new URL with params
    const queryString = buildQueryString(options)
    if (isDev) {
      settingsWindow.loadURL(`http://localhost:4001${queryString}`)
    } else {
      const settingsPath = path.join(
        __dirname,
        '..',
        '..',
        'windows',
        'settings',
        'index.html',
      )
      settingsWindow.loadFile(settingsPath, {
        search: queryString.slice(1),
      })
    }
    settingsWindow.show()
    settingsWindow.focus()
  } else {
    createSettingsWindow(options)
  }
}
