import { createLogger } from '../../lib/logger'
import { fetchContacts } from '../../sources/icontacts'
import { uploadContacts } from './upload'
import { createScheduledService, type SyncResult } from '../scheduler'

const log = createLogger('icontacts-service')

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

async function syncAndUpload(): Promise<SyncResult> {
  log.info('Syncing...')
  await yieldToEventLoop()

  const contacts = fetchContacts()
  if (contacts.length === 0) {
    log.info('No contacts to sync')
    return { success: true }
  }

  log.info(`Fetched ${contacts.length} contacts`)
  await yieldToEventLoop()

  await uploadContacts(contacts)
  return { success: true }
}

export const iContactsService = createScheduledService({
  name: 'icontacts',
  configKey: 'icontactsSync',
  onSync: syncAndUpload,
})
