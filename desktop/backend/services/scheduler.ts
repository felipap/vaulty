import { store } from '../store'
import type { SyncStatus, Service } from './index'

type ConfigKey = 'screenCapture' | 'imessageExport' | 'contactsSync'

type SchedulerOptions = {
  name: string
  configKey: ConfigKey
  onSync: () => Promise<void>
  onStart?: () => void
  onStop?: () => void
}

export function createScheduledService(options: SchedulerOptions): Service {
  const { name, configKey, onSync, onStart, onStop } = options

  let interval: NodeJS.Timeout | null = null
  let nextRunTime: Date | null = null
  let lastSyncStatus: SyncStatus = null

  async function runSync(): Promise<void> {
    try {
      await onSync()
      lastSyncStatus = 'success'
    } catch (error) {
      const isConnectionError =
        error instanceof TypeError &&
        error.message === 'fetch failed' &&
        error.cause &&
        (error.cause as { code?: string }).code === 'ECONNREFUSED'

      if (isConnectionError) {
        console.error(`[${name}] Sync failed: Could not connect to server`)
      } else {
        console.error(`[${name}] Sync failed:`, error)
      }
      lastSyncStatus = 'error'
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
      console.log(`[${name}] Already running`)
      return
    }

    const config = store.get(configKey)
    if (!config.enabled) {
      console.log(`[${name}] Disabled`)
      return
    }

    console.log(`[${name}] Starting...`)
    onStart?.()

    // Check if we have a persisted next sync time
    const persistedNextSync = config.nextSyncAfter
      ? new Date(config.nextSyncAfter)
      : null
    const now = new Date()

    if (persistedNextSync && persistedNextSync > now) {
      // Resume schedule - wait until the persisted time
      const waitMs = persistedNextSync.getTime() - now.getTime()
      console.log(
        `[${name}] Resuming schedule, next run in ${Math.round(waitMs / 1000)}s`,
      )
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
      console.log(`[${name}] Stopped`)
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
  }
}
