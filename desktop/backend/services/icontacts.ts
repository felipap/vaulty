import { startAnimating, stopAnimating } from '../tray/animate'
import { fetchContacts, uploadContacts } from '../sources/icontacts'
import { createScheduledService } from './scheduler'

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

async function syncAndUpload(): Promise<void> {
  console.log('[contacts] Syncing...')
  await yieldToEventLoop()

  const contacts = fetchContacts()
  if (contacts.length === 0) {
    console.log('[contacts] No contacts to sync')
    return
  }

  console.log(`Fetched ${contacts.length} contacts`)
  await yieldToEventLoop()

  startAnimating('vault-rotation')
  try {
    await uploadContacts(contacts)
  } finally {
    stopAnimating()
  }
}

export const iContactsService = createScheduledService({
  name: 'icontacts',
  configKey: 'icontactsSync',
  onSync: syncAndUpload,
})
