import { encryptText, computeSearchIndex } from '../lib/encryption'
import { createLogger } from '../lib/logger'
import { apiRequest } from '../lib/contexter-api'
import { getEncryptionKey } from '../store'
import type { SyncResult } from './scheduler'

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

type JsonObject = { [key: string]: JsonValue }

type SearchIndex = {
  sourceField: string
  indexField: string
  normalize: (value: string) => string
}

export type SyncConfig = {
  encryptedFields: readonly string[]
  searchIndexes?: SearchIndex[]
  encryptedArrayFields?: readonly string[]
  searchIndexArrays?: SearchIndex[]
}

function encryptItems<T extends JsonObject>(
  items: T[],
  config: SyncConfig,
  encryptionKey: string,
): T[] {
  return items.map((item) => {
    const result = { ...item } as Record<string, unknown>

    if (config.searchIndexes) {
      for (const idx of config.searchIndexes) {
        const value = result[idx.sourceField]
        if (typeof value === 'string' && value) {
          result[idx.indexField] = computeSearchIndex(
            idx.normalize(value),
            encryptionKey,
          )
        }
      }
    }

    if (config.searchIndexArrays) {
      for (const idx of config.searchIndexArrays) {
        const values = result[idx.sourceField]
        if (Array.isArray(values)) {
          result[idx.indexField] = (values as string[])
            .map((v) => idx.normalize(v))
            .filter((v) => v.length > 0)
            .map((v) => computeSearchIndex(v, encryptionKey))
        }
      }
    }

    for (const field of config.encryptedFields) {
      const value = result[field]
      if (typeof value === 'string' && value) {
        result[field] = encryptText(value, encryptionKey)
      }
    }

    if (config.encryptedArrayFields) {
      for (const field of config.encryptedArrayFields) {
        const values = result[field]
        if (Array.isArray(values)) {
          result[field] = (values as string[]).map((v) =>
            encryptText(v, encryptionKey),
          )
        }
      }
    }

    return result as T
  })
}

export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

type UploadResult = { count: number } | { error: string }

export async function encryptAndUpload<T extends JsonObject>({
  items,
  config,
  apiPath,
  bodyKey,
  batchSize,
  extraBody,
  preprocess,
}: {
  items: T[]
  config: SyncConfig
  apiPath: string
  bodyKey: string
  batchSize?: number
  extraBody?: Record<string, unknown>
  preprocess?: (items: T[], encryptionKey: string) => T[]
}): Promise<UploadResult> {
  if (items.length === 0) {
    return { count: 0 }
  }

  const encryptionKey = getEncryptionKey()
  if (!encryptionKey) {
    return { error: 'Encryption key not set' }
  }

  const preprocessed = preprocess ? preprocess(items, encryptionKey) : items
  const encrypted = encryptItems(preprocessed, config, encryptionKey)

  if (batchSize) {
    for (let i = 0; i < encrypted.length; i += batchSize) {
      const batch = encrypted.slice(i, i + batchSize)
      await apiRequest({
        path: apiPath,
        body: { [bodyKey]: batch, ...extraBody },
      })
    }
  } else {
    await apiRequest({
      path: apiPath,
      body: { [bodyKey]: encrypted, ...extraBody },
    })
  }

  return { count: items.length }
}

export function createSyncHandler<T extends JsonObject>({
  label,
  fetch,
  upload,
}: {
  label: string
  fetch: () => T[]
  upload: (items: T[]) => Promise<UploadResult>
}): () => Promise<SyncResult> {
  const log = createLogger(label)
  return async () => {
    log.info('Syncing...')
    await yieldToEventLoop()

    const items = fetch()
    if (items.length === 0) {
      log.info(`No ${label} to sync`)
      return { success: true }
    }

    log.info(`Fetched ${items.length} ${label}`)
    await yieldToEventLoop()

    const result = await upload(items)
    if ('error' in result) {
      return { error: result.error }
    }
    log.info(`Uploaded ${result.count} ${label}`)
    return { success: true }
  }
}
