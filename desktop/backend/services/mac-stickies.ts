import { fetchStickies } from '../sources/mac-stickies'
import { createScheduledService } from './scheduler'
import { createSyncHandler, encryptAndUpload } from './upload-utils'

export const macosStickiesService = createScheduledService({
  name: 'macos-stickies',
  configKey: 'macosStickiesSync',
  onSync: createSyncHandler({
    label: 'macOS stickies',
    fetch: fetchStickies,
    upload: (items) =>
      encryptAndUpload({
        items,
        config: { encryptedFields: ['text'] },
        apiPath: '/api/macos-stickies',
        bodyKey: 'stickies',
      }),
  }),
})
