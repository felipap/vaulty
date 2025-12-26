export type Service = {
  name: string
  start: () => Promise<void>
  stop: () => void
  restart: () => void
  isRunning: () => boolean
  runNow: () => Promise<void>
  getNextRunTime: () => Date | null
  getTimeUntilNextRun: () => number
}

import { screenshotsService } from './screenshots'
import { imessageService } from './imessage'
import { contactsService } from './contacts'

export const SERVICES: Service[] = [
  imessageService,
  screenshotsService,
  contactsService,
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

export { screenshotsService, imessageService, contactsService }
