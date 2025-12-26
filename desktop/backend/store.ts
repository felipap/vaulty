import Store from 'electron-store'
import { randomUUID } from 'crypto'

export type ApiRequestLog = {
  id: string
  timestamp: number
  method: string
  path: string
  status: 'success' | 'error'
  statusCode?: number
  duration: number
  error?: string
}

type StoreSchema = {
  deviceId: string
  deviceSecret: string
  serverUrl: string
  screenCapture: {
    enabled: boolean
    intervalMinutes: number
  }
  imessageExport: {
    enabled: boolean
    intervalMinutes: number
    includeAttachments: boolean
  }
  contactsSync: {
    enabled: boolean
    intervalMinutes: number
  }
  requestLogs: ApiRequestLog[]
}

const MAX_LOGS = 100

export const store = new Store<StoreSchema>({
  defaults: {
    deviceId: randomUUID(),
    deviceSecret: '',
    serverUrl: 'http://localhost:3000',
    screenCapture: {
      enabled: true,
      intervalMinutes: 5,
    },
    imessageExport: {
      enabled: false,
      intervalMinutes: 5,
      includeAttachments: true,
    },
    contactsSync: {
      enabled: false,
      intervalMinutes: 60,
    },
    requestLogs: [],
  },
})

export function getDeviceSecret(): string {
  return store.get('deviceSecret')
}

export function setDeviceSecret(secret: string): void {
  store.set('deviceSecret', secret)
}

export function getDeviceId(): string {
  return store.get('deviceId')
}

export function addRequestLog(log: Omit<ApiRequestLog, 'id'>): void {
  const logs = store.get('requestLogs')
  const newLog: ApiRequestLog = {
    ...log,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  }
  const updatedLogs = [newLog, ...logs].slice(0, MAX_LOGS)
  store.set('requestLogs', updatedLogs)
}

export function getRequestLogs(): ApiRequestLog[] {
  return store.get('requestLogs')
}

export function clearRequestLogs(): void {
  store.set('requestLogs', [])
}
