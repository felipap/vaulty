// Data is stored at:
// - ~/Library/Application Support/Context/data.json
// - ~/Library/Application Support/ContextDev/data.json

import { app } from 'electron'
import Store from 'electron-store'
import { MAX_LOGS } from '../config'
import { debug } from '../lib/logger'
import { decryptSecret, encryptSecret } from './keychain'
import { ApiRequestLog, DEFAULT_STATE, StoreSchema } from './schema'

// Changes where the backend data is stored depending on dev or prod.
app.setName(`Context${app.isPackaged ? '' : 'Dev'}`)

debug('Store path:', app.getPath('userData'))

export const store = new Store<StoreSchema>({
  name: 'data',
  defaults: DEFAULT_STATE,
})

//
//
//
//
//
//
//
//

export function getDeviceSecret(): string | null {
  const stored = store.get('deviceSecret')
  if (!stored) {
    return null
  }
  return decryptSecret(stored)
}

export function setDeviceSecret(secret: string): void {
  const encrypted = encryptSecret(secret)
  store.set('deviceSecret', encrypted)
}

export function getEncryptionKey(): string | null {
  const stored = store.get('encryptionKey')
  if (!stored) {
    return null
  }
  return decryptSecret(stored)
}

export function setEncryptionKey(key: string): void {
  if (!key) {
    store.set('encryptionKey', null)
    return
  }
  const encrypted = encryptSecret(key)
  store.set('encryptionKey', encrypted)
}

export function getDeviceId(): string {
  const id = store.get('deviceId')
  if (!id) {
    throw new Error('Device ID is not set')
  }
  return id
}

export function getLastExportedMessageDate(): Date | null {
  const stored = store.get('imessageExport').lastExportedMessageDate
  if (!stored) {
    return null
  }
  return new Date(stored)
}

export function setLastExportedMessageDate(date: Date): void {
  const config = store.get('imessageExport')
  store.set('imessageExport', {
    ...config,
    lastExportedMessageDate: date.toISOString(),
  })
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
