import { fetchReminders } from '../sources/apple-reminders'
import { getDeviceId } from '../store'
import { createScheduledWriteService } from './scheduler'
import {
  createSyncHandler,
  encryptAndUpload,
  type SyncConfig,
} from './upload-utils'

const CONFIG: SyncConfig = {
  encryptedFields: ['title', 'notes', 'listName'],
}

function fetchSerializedReminders() {
  return fetchReminders().map((r) => ({
    id: r.id,
    title: r.title,
    notes: r.notes,
    listName: r.listName,
    completed: r.completed,
    flagged: r.flagged,
    priority: r.priority,
    dueDate: r.dueDate?.toISOString() ?? null,
    completionDate: r.completionDate?.toISOString() ?? null,
    creationDate: r.creationDate?.toISOString() ?? null,
    lastModifiedDate: r.lastModifiedDate?.toISOString() ?? null,
  }))
}

export const appleRemindersService = createScheduledWriteService({
  name: 'apple-reminders',
  configKey: 'appleRemindersSync',
  onSync: createSyncHandler({
    label: 'reminders',
    fetch: fetchSerializedReminders,
    upload: (items) =>
      encryptAndUpload({
        items,
        config: CONFIG,
        apiPath: '/api/apple-reminders',
        bodyKey: 'reminders',
        batchSize: 100,
        extraBody: {
          syncTime: new Date().toISOString(),
          deviceId: getDeviceId(),
        },
      }),
  }),
})
