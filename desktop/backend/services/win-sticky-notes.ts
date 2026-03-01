import { fetchWinStickyNotes } from '../sources/win-sticky-notes'
import { createScheduledWriteService } from './scheduler'
import { createSyncHandler, encryptAndUpload } from './upload-utils'

export const winStickyNotesService = createScheduledWriteService({
  name: 'win-sticky-notes',
  configKey: 'winStickyNotesSync',
  onSync: createSyncHandler({
    label: 'Windows sticky notes',
    fetch: fetchWinStickyNotes,
    upload: (items) =>
      encryptAndUpload({
        items,
        config: { encryptedFields: ['text'] },
        apiPath: '/api/win-sticky-notes',
        bodyKey: 'stickies',
      }),
  }),
})
