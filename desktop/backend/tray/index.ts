import {
  app,
  Menu,
  MenuItemConstructorOptions,
  Notification,
  shell,
  Tray,
  nativeImage,
} from 'electron'
import path from 'path'
import {
  SERVICES,
  Service,
  startAllServices,
  stopAllServices,
} from '../services'
import { getEncryptionKey, store } from '../store'
import { showMainWindow } from '../windows/settings'

let tray: Tray | null = null
let updateInterval: NodeJS.Timeout | null = null
let sleepTimer: NodeJS.Timeout | null = null
let wakeWarningTimer: NodeJS.Timeout | null = null

const WAKE_WARNING_MS = 2 * 60 * 1000

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

function getSleepUntil(): Date | null {
  const stored = store.get('sleepUntil')
  if (!stored) {
    return null
  }
  return new Date(stored)
}

function isSleeping(): boolean {
  const sleepUntil = getSleepUntil()
  return sleepUntil !== null && sleepUntil > new Date()
}

function scheduleSleepWakeUp(ms: number): void {
  if (sleepTimer) {
    clearTimeout(sleepTimer)
  }
  if (wakeWarningTimer) {
    clearTimeout(wakeWarningTimer)
  }

  if (ms > WAKE_WARNING_MS) {
    wakeWarningTimer = setTimeout(() => {
      new Notification({
        title: 'Vaulty',
        body: 'Syncs will resume in 2 minutes',
      }).show()
    }, ms - WAKE_WARNING_MS)
  }

  sleepTimer = setTimeout(() => {
    wakeUp()
  }, ms)
}

function sleepFor(ms: number): void {
  wakeUp()
  store.set('sleepUntil', new Date(Date.now() + ms).toISOString())
  stopAllServices()
  setTrayIcon('tray-paused.png')
  scheduleSleepWakeUp(ms)
  updateTrayMenu()
}

function sleepUntilTomorrow(): void {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)
  const ms = tomorrow.getTime() - Date.now()
  sleepFor(ms)
}

function wakeUp(): void {
  if (sleepTimer) {
    clearTimeout(sleepTimer)
    sleepTimer = null
  }
  if (wakeWarningTimer) {
    clearTimeout(wakeWarningTimer)
    wakeWarningTimer = null
  }
  if (store.get('sleepUntil')) {
    store.set('sleepUntil', null)
    setTrayIcon('tray-default.png')
    startAllServices()
    updateTrayMenu()
  }
}

function restoreSleepState(): void {
  const sleepUntil = getSleepUntil()
  if (!sleepUntil) {
    return
  }
  const remaining = sleepUntil.getTime() - Date.now()
  if (remaining <= 0) {
    store.set('sleepUntil', null)
    return
  }
  stopAllServices()
  setTrayIcon('tray-paused.png')
  scheduleSleepWakeUp(remaining)
}

function formatSleepRemaining(): string {
  const sleepUntil = getSleepUntil()
  if (!sleepUntil) {
    return ''
  }
  const ms = sleepUntil.getTime() - Date.now()
  if (ms <= 0) {
    return ''
  }
  return formatTimeUntilNextRun(ms)
}

function createTrayIcon(): Tray {
  const iconPath = getAssetsPath('tray-default.png')
  const icon = nativeImage.createFromPath(iconPath)
  const trayIcon = icon.resize({ width: 18, quality: 'best' })
  trayIcon.setTemplateImage(true)

  tray = new Tray(trayIcon)
  tray.setToolTip('Vaulty')

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
      const lastFailedSyncId = service.getLastFailedSyncId()
      items.push({
        label: '  ⚠️ Last sync failed',
        click: () => {
          showMainWindow({
            tab: 'logs',
            highlightSyncId: lastFailedSyncId ?? undefined,
          })
        },
      })
    }

    items.push({
      label: '  Sync Now',
      click: () => {
        service.runNow()
      },
    })

    return items
  }

  const MAX_TRAY_SERVICES = 6
  const visibleServices = SERVICES.slice(0, MAX_TRAY_SERVICES)
  const hiddenServices = SERVICES.slice(MAX_TRAY_SERVICES)

  const serviceMenuItems: MenuItemConstructorOptions[] = []

  for (const service of visibleServices) {
    if (serviceMenuItems.length > 0) {
      serviceMenuItems.push({ type: 'separator' })
    }
    serviceMenuItems.push(...buildServiceMenuItems(service))
  }

  if (hiddenServices.length > 0) {
    const enabledCount = hiddenServices.filter((s) => s.isEnabled()).length
    const disabledCount = hiddenServices.length - enabledCount

    const parts: string[] = []
    if (enabledCount > 0) {
      parts.push(`${enabledCount} active`)
    }
    if (disabledCount > 0) {
      parts.push(`${disabledCount} inactive`)
    }

    serviceMenuItems.push({ type: 'separator' })
    serviceMenuItems.push({
      label: `${hiddenServices.length} more syncs (${parts.join(', ')})`,
      click: () => showMainWindow(),
    })
  }

  const serverUrl = store.get('serverUrl')
  const encryptionKey = getEncryptionKey()
  const canOpenDashboard = Boolean(serverUrl && encryptionKey)

  const sleeping = isSleeping()

  const contextMenu = Menu.buildFromTemplate([
    ...(sleeping
      ? [
          {
            label: `Vaulty Sleeping — ${formatSleepRemaining()} left (click to wake)`,
            click: () => wakeUp(),
          },
          { type: 'separator' as const },
        ]
      : []),
    ...serviceMenuItems,
    { type: 'separator' },
    {
      label: `Vaulty Dashboard... ${app.isPackaged ? '' : '(DEV)'}`,
      enabled: canOpenDashboard,
      click: () => {
        if (serverUrl && encryptionKey) {
          const base = /^https?:\/\//i.test(serverUrl)
            ? serverUrl
            : `https://${serverUrl}`
          const url = new URL('/dashboard', base)
          url.searchParams.set('key', encryptionKey)
          shell.openExternal(url.toString())
        }
      },
    },
    ...(!sleeping
      ? [
          {
            label: 'Sleep for...',
            submenu: [
              { label: '5 minutes', click: () => sleepFor(5 * 60 * 1000) },
              { label: '10 minutes', click: () => sleepFor(10 * 60 * 1000) },
              { label: '30 minutes', click: () => sleepFor(30 * 60 * 1000) },
              { label: '1 hour', click: () => sleepFor(60 * 60 * 1000) },
              { label: 'Until tomorrow', click: () => sleepUntilTomorrow() },
            ],
          },
        ]
      : []),
    { type: 'separator' },
    {
      label: 'Settings',
      accelerator: 'CmdOrCtrl+,',
      click: () => showMainWindow(),
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
  restoreSleepState()
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
