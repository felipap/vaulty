import {
  app,
  Menu,
  MenuItemConstructorOptions,
  Tray,
  nativeImage,
} from 'electron'
import path from 'path'
import { SERVICES, Service } from '../services'
import { showMainWindow } from '../windows/settings'

let tray: Tray | null = null
let updateInterval: NodeJS.Timeout | null = null

const SERVICE_LABELS: Record<string, string> = {
  screenshots: 'Screenshots',
  imessage: 'iMessage',
  contacts: 'Contacts',
}

export function getAssetsPath(name: string): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../../assets')
  return path.join(base, name)
}

function formatTimeUntilNextRun(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds}s`
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

  function buildServiceMenuItems(
    service: Service,
  ): MenuItemConstructorOptions[] {
    const label = SERVICE_LABELS[service.name] || service.name
    const isEnabled = service.isEnabled()

    if (!isEnabled) {
      return [
        {
          label: `${label} (disabled)`,
          enabled: false,
        },
      ]
    }

    const isRunning = service.isRunning()
    const timeUntilNext = formatTimeUntilNextRun(service.getTimeUntilNextRun())
    const lastSyncStatus = service.getLastSyncStatus()

    const items: MenuItemConstructorOptions[] = [
      {
        label,
        enabled: false,
      },
      {
        label: isRunning ? `  Next: ${timeUntilNext}` : '  Not running',
        enabled: false,
      },
    ]

    if (lastSyncStatus === 'error') {
      items.push({
        label: '  ⚠️ Last sync failed',
        enabled: false,
      })
    }

    items.push({
      label: '  Run Now',
      click: () => {
        service.runNow()
      },
    })

    return items
  }

  const serviceMenuItems: MenuItemConstructorOptions[] = []

  for (const service of SERVICES) {
    if (serviceMenuItems.length > 0) {
      serviceMenuItems.push({ type: 'separator' })
    }
    serviceMenuItems.push(...buildServiceMenuItems(service))
  }

  const contextMenu = Menu.buildFromTemplate([
    ...serviceMenuItems,
    { type: 'separator' },
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
