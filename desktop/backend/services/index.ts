export type SyncStatus = 'success' | 'error' | null

export type Service = {
  name: string
  start: () => Promise<void>
  stop: () => void
  restart: () => void
  isRunning: () => boolean
  isEnabled: () => boolean
  runNow: () => Promise<void>
  getNextRunTime: () => Date | null
  getTimeUntilNextRun: () => number
  getLastSyncStatus: () => SyncStatus
  getLastFailedSyncId: () => string | null
}

import { screenshotsService } from './screenshots'
import { imessageService } from './imessage'
import { contactsService } from './contacts'
import { whatsappSqliteService, whatsappUnipileService } from './whatsapp'

export const SERVICES: Service[] = [
  imessageService,
  screenshotsService,
  contactsService,
  whatsappSqliteService,
  whatsappUnipileService,
]

export async function startAllServices(): Promise<void> {
  console.log('Starting all services...')

  for (const service of SERVICES) {
    console.debug(`Will start service ${service.name}`)
    await service.start()
  }
  console.log('All services started')
}

export function stopAllServices(): void {
  for (const service of SERVICES) {
    service.stop()
  }
}

export function getService(name: string): Service | undefined {
  return SERVICES.find((s) => s.name === name)
}

export {
  screenshotsService,
  imessageService,
  contactsService,
  whatsappSqliteService,
  whatsappUnipileService,
}
