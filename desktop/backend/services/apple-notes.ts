import { fetchNotes } from '../sources/apple-notes'
import { createScheduledService } from './scheduler'
import { createSyncHandler, encryptAndUpload } from './upload-utils'

export const appleNotesService = createScheduledService({
  name: 'apple-notes',
  configKey: 'appleNotesSync',
  onSync: createSyncHandler({
    label: 'Apple Notes',
    fetch: fetchNotes,
    upload: (items) =>
      encryptAndUpload({
        items,
        config: { encryptedFields: ['title', 'body'] },
        apiPath: '/api/apple-notes',
        bodyKey: 'notes',
      }),
  }),
})
