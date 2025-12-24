import { app, Menu, Tray, nativeImage } from 'electron'
import path from 'path'
import {
  formatTimeUntilNextCapture,
  isScreenCaptureRunning,
  startScreenCapture,
  stopScreenCapture,
} from '../screen-capture'
import { showMainWindow } from '../windows/settings'
import { store } from '../store'
import { startAnimating } from './animate'

let tray: Tray | null = null
let updateInterval: NodeJS.Timeout | null = null

export function getAssetsPath(name: string): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../../assets')
  return path.join(base, name)
}

function createTrayIcon(): Tray {
  const iconPath = getAssetsPath('tray-default.png')
  const icon = nativeImage.createFromPath(iconPath)
  const trayIcon = icon.resize({ width: 18, quality: 'best' })
  trayIcon.setTemplateImage(true)

  tray = new Tray(trayIcon)
  tray.setToolTip('Context')

  updateTrayMenu()

  return tray
}

function updateTrayMenu(): void {
  if (!tray) {
    return
  }

  const isCapturing = isScreenCaptureRunning()
  const timeUntilNext = formatTimeUntilNextCapture()
  const screenCaptureConfig = store.get('screenCapture')
  const intervalMinutes = screenCaptureConfig.intervalMinutes

  const contextMenu = Menu.buildFromTemplate([
    // Screen Capture Section
    {
      label: 'Screen Capture',
      enabled: false,
    },
    {
      label: isCapturing ? `  Next capture in: ${timeUntilNext}` : '  Disabled',
      enabled: false,
    },
    {
      label: `  Interval: ${intervalMinutes} minutes`,
      enabled: false,
    },
    { type: 'separator' },

    // Actions
    {
      label: isCapturing ? 'Pause Screen Capture' : 'Resume Screen Capture',
      click: () => {
        const config = store.get('screenCapture')
        if (isCapturing) {
          stopScreenCapture()
          store.set('screenCapture', { ...config, enabled: false })
        } else {
          store.set('screenCapture', { ...config, enabled: true })
          startScreenCapture()
        }
        updateTrayMenu()
      },
    },
    { type: 'separator' },

    // Window and app controls
    {
      label: 'Settings',
      accelerator: 'CmdOrCtrl+,',
      click: showMainWindow,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

function startTrayUpdates(): void {
  // Update the tray menu every second to show countdown
  updateInterval = setInterval(() => {
    updateTrayMenu()
  }, 1000)
}

function stopTrayUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

export function initTray(): Tray {
  const tray = createTrayIcon()
  startTrayUpdates()
  return tray
}

export function destroyTray(): void {
  stopTrayUpdates()
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function setTrayIcon(iconName: string): void {
  if (!tray) {
    return
  }

  const iconPath = getAssetsPath(iconName)
  const icon = nativeImage.createFromPath(iconPath)
  const trayIcon = icon.resize({ width: 18, quality: 'best' })
  trayIcon.setTemplateImage(true)

  tray.setImage(trayIcon)
}

export function refreshTrayMenu(): void {
  updateTrayMenu()
}

// startAnimating('old')
