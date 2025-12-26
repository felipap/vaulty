import { BrowserWindow, app } from 'electron'
import path from 'node:path'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function showDock(): void {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show()
  }
}

function hideDock(): void {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }
}

export function createMainWindow(): BrowserWindow {
  showDock()

  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:4001')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    hideDock()
  })

  mainWindow.on('hide', () => {
    hideDock()
  })

  mainWindow.on('show', () => {
    showDock()
  })

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function showMainWindow(): void {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createMainWindow()
  }
}
