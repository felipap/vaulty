import Database from 'better-sqlite3'
import { readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export type AppleContact = {
  id: string
  firstName: string | null
  lastName: string | null
  organization: string | null
  emails: string[]
  phoneNumbers: string[]
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

export function fetchContacts(): AppleContact[] {
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

  const contacts: AppleContact[] = people
    .filter((person) => person.firstName)
    .map((person) => {
      const emails = emailStmt.all(person.pk) as Array<{
        email: string | null
      }>
      const phones = phoneStmt.all(person.pk) as Array<{
        phone: string | null
      }>

      const normalizedPhones = phones
        .map((p) => p.phone)
        // .filter(Boolean)
        // .map((p) => normalizePhoneToE164(p!))
        .filter(Boolean) as string[]

      return {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        organization: person.organization,
        emails: emails.map((e) => e.email).filter(Boolean) as string[],
        phoneNumbers: normalizedPhones,
      }
    })

  db.close()

  return contacts
}
