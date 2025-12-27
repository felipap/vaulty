import { store } from '../store'
import { startAnimating, stopAnimating } from '../tray/animate'
import { fetchContacts, uploadContacts } from '../sources/contacts'
import type { Service, SyncStatus } from './index'

let syncInterval: NodeJS.Timeout | null = null
let nextSyncTime: Date | null = null
let lastSyncStatus: SyncStatus = null

async function syncAndUpload(): Promise<void> {
  console.log('[contacts] Syncing...')

  const contacts = fetchContacts()
  if (contacts.length === 0) {
    console.log('[contacts] No contacts to sync')
    lastSyncStatus = 'success'
    return
  }

  console.log(`Fetched ${contacts.length} contacts`)

  startAnimating('old')
  try {
    await uploadContacts(contacts)
    lastSyncStatus = 'success'
  } catch (error) {
    console.error('[contacts] Failed to upload:', error)
    lastSyncStatus = 'error'
  } finally {
    stopAnimating()
  }
}

function scheduleNextSync(): void {
  const config = store.get('contactsSync')
  const intervalMs = config.intervalMinutes * 60 * 1000

  nextSyncTime = new Date(Date.now() + intervalMs)

  syncInterval = setTimeout(async () => {
    try {
      await syncAndUpload()
    } catch (error) {
      console.error('[contacts] Scheduled sync failed:', error)
    }
    scheduleNextSync()
  }, intervalMs)
}

async function start(): Promise<void> {
  if (syncInterval) {
    console.log('[contacts] Already running')
    return
  }

  const config = store.get('contactsSync')
  if (!config.enabled) {
    console.log('[contacts] Disabled')
    return
  }

  console.log('[contacts] Starting...')

  // Do initial sync, but don't let failures prevent scheduling
  try {
    console.log('initial sync')
    await syncAndUpload()
    console.log('initial sync done')
  } catch (error) {
    console.error('[contacts] Initial sync failed:', error)
  }

  scheduleNextSync()
}

function stop(): void {
  if (syncInterval) {
    clearTimeout(syncInterval)
    syncInterval = null
    nextSyncTime = null
    console.log('[contacts] Stopped')
  }
}

function restart(): void {
  stop()
  start()
}

function isRunning(): boolean {
  return syncInterval !== null
}

async function runNow(): Promise<void> {
  const config = store.get('contactsSync')
  if (!config.enabled) {
    throw new Error('Contacts sync is disabled')
  }

  try {
    await syncAndUpload()
  } catch (error) {
    console.error('[contacts] Manual sync failed:', error)
  }

  // Restart the clock after manual run
  if (syncInterval) {
    clearTimeout(syncInterval)
    scheduleNextSync()
  }
}

function getNextRunTime(): Date | null {
  return nextSyncTime
}

function getTimeUntilNextRun(): number {
  if (!nextSyncTime) {
    return 0
  }
  return Math.max(0, nextSyncTime.getTime() - Date.now())
}

function isEnabled(): boolean {
  return store.get('contactsSync').enabled
}

function getLastSyncStatus(): SyncStatus {
  return lastSyncStatus
}

export const contactsService: Service = {
  name: 'contacts',
  start,
  stop,
  restart,
  isRunning,
  isEnabled,
  runNow,
  getNextRunTime,
  getTimeUntilNextRun,
  getLastSyncStatus,
}
