import Database from 'better-sqlite3'
import { readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { apiRequest } from '../../lib/contexter-api'
import { computeSearchIndex, encryptText } from '../../lib/encryption'
import {
  normalizeChatNameForSearch,
  normalizePhoneForSearch,
} from '../../lib/search-index-utils'
import { getDeviceId, getEncryptionKey } from '../../store'

export type Contact = {
  id: string
  firstName: string | null
  lastName: string | null
  organization: string | null
  emails: string[]
  phoneNumbers: string[]
}

type EncryptedContact = Contact & {
  nameIndex?: string
  phoneNumbersIndex?: string[]
}

function findContactsDatabase(): string | null {
  const addressBookDir = join(
    homedir(),
    'Library/Application Support/AddressBook/Sources',
  )

  try {
    const sources = readdirSync(addressBookDir)
    for (const source of sources) {
      const dbPath = join(addressBookDir, source, 'AddressBook-v22.abcddb')
      try {
        readdirSync(join(addressBookDir, source)).includes(
          'AddressBook-v22.abcddb',
        )
        return dbPath
      } catch {
        continue
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return null
}

export function fetchContacts(): Contact[] {
  const dbPath = findContactsDatabase()
  if (!dbPath) {
    console.error('[contacts] Could not find Contacts database')
    return []
  }

  const db = new Database(dbPath, { readonly: true })

  const people = db
    .prepare(
      `
      SELECT
        ZUNIQUEID as id,
        ZFIRSTNAME as firstName,
        ZLASTNAME as lastName,
        ZORGANIZATION as organization,
        Z_PK as pk
      FROM ZABCDRECORD
      WHERE ZUNIQUEID IS NOT NULL
    `,
    )
    .all() as Array<{
    id: string
    firstName: string | null
    lastName: string | null
    organization: string | null
    pk: number
  }>

  const emailStmt = db.prepare(`
    SELECT ZADDRESSNORMALIZED as email
    FROM ZABCDEMAILADDRESS
    WHERE ZOWNER = ?
  `)

  const phoneStmt = db.prepare(`
    SELECT ZFULLNUMBER as phone
    FROM ZABCDPHONENUMBER
    WHERE ZOWNER = ?
  `)

  const contacts: Contact[] = people.map((person) => {
    const emails = emailStmt.all(person.pk) as Array<{ email: string | null }>
    const phones = phoneStmt.all(person.pk) as Array<{ phone: string | null }>

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      organization: person.organization,
      emails: emails.map((e) => e.email).filter(Boolean) as string[],
      phoneNumbers: phones.map((p) => p.phone).filter(Boolean) as string[],
    }
  })

  db.close()

  return contacts
}

function encryptContacts(
  contacts: Contact[],
  encryptionKey: string,
): EncryptedContact[] {
  return contacts.map((c) => {
    const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
    const normalizedName = fullName
      ? normalizeChatNameForSearch(fullName)
      : null

    return {
      ...c,
      firstName: c.firstName
        ? encryptText(c.firstName, encryptionKey)
        : c.firstName,
      lastName: c.lastName
        ? encryptText(c.lastName, encryptionKey)
        : c.lastName,
      nameIndex: normalizedName
        ? computeSearchIndex(normalizedName, encryptionKey)
        : undefined,
      organization: c.organization
        ? encryptText(c.organization, encryptionKey)
        : c.organization,
      emails: c.emails.map((e) => encryptText(e, encryptionKey)),
      phoneNumbers: c.phoneNumbers.map((p) => encryptText(p, encryptionKey)),
      phoneNumbersIndex: c.phoneNumbers
        .map((p) => normalizePhoneForSearch(p))
        .filter((p) => p.length > 0)
        .map((p) => computeSearchIndex(p, encryptionKey)),
    }
  })
}

export async function uploadContacts(contacts: Contact[]): Promise<void> {
  if (contacts.length === 0) {
    return
  }

  const encryptionKey = getEncryptionKey()
  const contactsToUpload = encryptionKey
    ? encryptContacts(contacts, encryptionKey)
    : contacts

  await apiRequest({
    path: '/api/contacts',
    body: {
      contacts: contactsToUpload,
      syncTime: new Date().toISOString(),
      deviceId: getDeviceId(),
    },
  })

  console.log(`Uploaded ${contacts.length} contacts successfully`)
}
