import {
  normalizePhoneForSearch,
  normalizeStringForSearch,
} from '../lib/search-index-utils'
import { fetchContacts } from '../sources/apple-contacts'
import { getDeviceId } from '../store'
import { createScheduledWriteService } from './scheduler'
import {
  createSyncHandler,
  encryptAndUpload,
  type SyncConfig,
} from './upload-utils'

const CONFIG: SyncConfig = {
  encryptedFields: ['firstName', 'lastName', 'organization'],
  encryptedArrayFields: ['emails', 'phoneNumbers'],
  searchIndexes: [
    {
      sourceField: 'firstName',
      indexField: 'firstNameIndex',
      normalize: normalizeStringForSearch,
    },
    {
      sourceField: 'lastName',
      indexField: 'lastNameIndex',
      normalize: normalizeStringForSearch,
    },
  ],
  searchIndexArrays: [
    {
      sourceField: 'phoneNumbers',
      indexField: 'phoneNumbersIndex',
      normalize: normalizePhoneForSearch,
    },
  ],
}

export const iContactsService = createScheduledWriteService({
  name: 'apple-contacts',
  configKey: 'appleContactsSync',
  onSync: createSyncHandler({
    label: 'contacts',
    fetch: fetchContacts,
    upload: (items) =>
      encryptAndUpload({
        items,
        config: CONFIG,
        apiPath: '/api/apple-contacts',
        bodyKey: 'contacts',
        batchSize: 100,
        extraBody: {
          syncTime: new Date().toISOString(),
          deviceId: getDeviceId(),
        },
      }),
  }),
})
