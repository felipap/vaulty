export type {
  ApiRequestLog,
  ServiceConfig,
  IMessageExportConfig,
  ServiceStatus,
  BackfillProgress,
  ElectronAPI,
  UnipileWhatsappConfig,
} from '../shared-types'

import type { ElectronAPI } from '../shared-types'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
