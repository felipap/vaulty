export type {
  SyncLog,
  SyncLogSource,
  ServiceConfig,
  ServiceConfigKey,
  ServiceConfigMap,
  IMessageExportConfig,
  WriteJobsConfig,
  ServiceStatus,
  BackfillProgress,
  ElectronAPI,
  WhatsappSqliteConfig,
} from '../shared-types'

export { SOURCE_LABELS } from '../shared-types'

import type { ElectronAPI } from '../shared-types'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
