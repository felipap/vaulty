import { createLogger } from '../lib/logger'
import { startAnimating, stopAnimating } from '../tray/animate'
import { addSyncLog, getEncryptionKey, store } from '../store'
import type { SyncLogSource } from '../store/schema'
import type { ServiceConfigKey } from '../../shared-types'
import type { SyncStatus, Service } from './index'

class MissingEncryptionKeyError extends Error {
  constructor() {
    super('Encryption key is required but not set')
    this.name = 'MissingEncryptionKeyError'
  }
}

export type SyncResult = { success: true } | { error: string }

type SchedulerOptions = {
  name: SyncLogSource
  configKey: ServiceConfigKey
  onSync: () => Promise<SyncResult>
  onStart?: () => void
  onStop?: () => void
}

export function createScheduledWriteService(
  options: SchedulerOptions,
): Service {
  const { name, configKey, onSync, onStart, onStop } = options
  const log = createLogger(name)

  let interval: NodeJS.Timeout | null = null
  let nextRunTime: Date | null = null
  let lastSyncStatus: SyncStatus = null
  let lastFailedSyncId: string | null = null

  async function runSync(): Promise<void> {
    const startTime = Date.now()

    // Check for encryption key before syncing
    const encryptionKey = getEncryptionKey()
    if (!encryptionKey) {
      log.info('Skipping sync: encryption key not set')
      lastSyncStatus = 'error'
      lastFailedSyncId = addSyncLog({
        timestamp: startTime,
        source: name,
        status: 'error',
        errorMessage: 'Encryption key not set',
        duration: Date.now() - startTime,
      })
      return
    }

    startAnimating('vault-rotation')
    try {
      const result = await onSync()

      if ('error' in result) {
        log.error('Sync failed:', result.error)
        lastSyncStatus = 'error'
        lastFailedSyncId = addSyncLog({
          timestamp: startTime,
          source: name,
          status: 'error',
          errorMessage: result.error,
          duration: Date.now() - startTime,
        })
      } else {
        lastSyncStatus = 'success'
        addSyncLog({
          timestamp: startTime,
          source: name,
          status: 'success',
          duration: Date.now() - startTime,
        })
      }
    } catch (error) {
      const isConnectionError =
        error instanceof TypeError &&
        error.message === 'fetch failed' &&
        error.cause &&
        (error.cause as { code?: string }).code === 'ECONNREFUSED'

      let errorMessage: string
      if (isConnectionError) {
        errorMessage = 'Could not connect to server'
        log.error('Sync failed: Could not connect to server')
      } else if (error instanceof Error) {
        errorMessage = error.message
        log.error('Sync failed:', error)
      } else {
        errorMessage = String(error)
        log.error('Sync failed:', error)
      }

      lastSyncStatus = 'error'
      lastFailedSyncId = addSyncLog({
        timestamp: startTime,
        source: name,
        status: 'error',
        errorMessage,
        duration: Date.now() - startTime,
      })
    } finally {
      stopAnimating()
    }
  }

  function scheduleNext(): void {
    const config = store.get(configKey)
    const intervalMs = config.intervalMinutes * 60 * 1000

    nextRunTime = new Date(Date.now() + intervalMs)

    // Persist the next sync time
    store.set(configKey, {
      ...config,
      nextSyncAfter: nextRunTime.toISOString(),
    })

    interval = setTimeout(async () => {
      await runSync()
      scheduleNext()
    }, intervalMs)
  }

  async function start(): Promise<void> {
    if (interval) {
      log.info('Already running')
      return
    }

    const config = store.get(configKey)
    if (!config.enabled) {
      log.info('Disabled')
      return
    }

    log.info('Starting...')
    onStart?.()

    // Check if we have a persisted next sync time
    const persistedNextSync = config.nextSyncAfter
      ? new Date(config.nextSyncAfter)
      : null
    const now = new Date()

    if (persistedNextSync && persistedNextSync > now) {
      // Resume schedule - wait until the persisted time
      const waitMs = persistedNextSync.getTime() - now.getTime()
      log.info(`Resuming schedule, next run in ${formatMs(waitMs)}`)
      nextRunTime = persistedNextSync

      interval = setTimeout(async () => {
        await runSync()
        scheduleNext()
      }, waitMs)
    } else {
      // Do initial sync
      await runSync()
      scheduleNext()
    }
  }

  function stop(): void {
    if (interval) {
      clearTimeout(interval)
      interval = null
      nextRunTime = null
      log.info('Stopped')
    }
    onStop?.()
  }

  function restart(): void {
    stop()
    start()
  }

  function isRunning(): boolean {
    return interval !== null
  }

  function isEnabled(): boolean {
    return store.get(configKey).enabled
  }

  async function runNow(): Promise<void> {
    const config = store.get(configKey)
    if (!config.enabled) {
      throw new Error(`${name} is disabled`)
    }

    const encryptionKey = getEncryptionKey()
    if (!encryptionKey) {
      throw new MissingEncryptionKeyError()
    }

    await runSync()

    // Restart the timer after manual run
    if (interval) {
      clearTimeout(interval)
      scheduleNext()
    }
  }

  function getNextRunTime(): Date | null {
    return nextRunTime
  }

  function getTimeUntilNextRun(): number {
    if (!nextRunTime) {
      return 0
    }
    return Math.max(0, nextRunTime.getTime() - Date.now())
  }

  function getLastSyncStatus(): SyncStatus {
    return lastSyncStatus
  }

  function getLastFailedSyncId(): string | null {
    return lastFailedSyncId
  }

  return {
    name,
    start,
    stop,
    restart,
    isRunning,
    isEnabled,
    runNow,
    getNextRunTime,
    getTimeUntilNextRun,
    getLastSyncStatus,
    getLastFailedSyncId,
  }
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (days) {
    parts.push(`${days}d`)
  }
  if (hours || parts.length) {
    parts.push(`${hours}h`)
  }
  if (minutes || parts.length) {
    parts.push(`${minutes}m`)
  }
  parts.push(`${seconds}s`)

  return parts.join('')
}
