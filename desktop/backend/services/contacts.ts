import { startAnimating, stopAnimating } from '../tray/animate'
import { fetchContacts, uploadContacts } from '../sources/contacts'
import { createScheduledService } from './scheduler'

async function syncAndUpload(): Promise<void> {
  console.log('[contacts] Syncing...')

  const contacts = fetchContacts()
  if (contacts.length === 0) {
    console.log('[contacts] No contacts to sync')
    return
  }

  console.log(`Fetched ${contacts.length} contacts`)

  startAnimating('old')
  try {
    await uploadContacts(contacts)
  } finally {
    stopAnimating()
  }
}

export const contactsService = createScheduledService({
  name: 'contacts',
  configKey: 'contactsSync',
  onSync: syncAndUpload,
})
