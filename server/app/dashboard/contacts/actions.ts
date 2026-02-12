"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { Contacts } from "@/db/schema"
import { and, desc, eq, or, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type Contact = {
  id: string
  contactId: string
  firstName: string | null
  lastName: string | null
  organization: string | null
  emails: string[]
  phoneNumbers: string[]
}

export type ContactDetail = Contact & {
  deviceId: string
  syncTime: Date
  createdAt: Date
  updatedAt: Date
}

export type ContactsPage = {
  contacts: Contact[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ContactSearchParams = {
  nameIndex?: string
  phoneNumberIndex?: string
}

export async function getContacts(
  page: number = 1,
  pageSize: number = 20,
  searchParams: ContactSearchParams = {}
): Promise<ContactsPage> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const offset = (page - 1) * pageSize

  const { nameIndex, phoneNumberIndex } = searchParams
  const hasNameSearch = !!nameIndex
  const hasPhoneSearch = !!phoneNumberIndex
  const hasSearch = hasNameSearch || hasPhoneSearch

  const searchCondition = hasSearch
    ? or(
        hasNameSearch ? eq(Contacts.nameIndex, nameIndex) : undefined,
        hasPhoneSearch
          ? sql`${phoneNumberIndex} = ANY(${Contacts.phoneNumbersIndex})`
          : undefined
      )
    : undefined

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(Contacts)
    .where(searchCondition)

  const total = countResult.count

  const results = await db
    .select()
    .from(Contacts)
    .where(searchCondition)
    .orderBy(desc(Contacts.updatedAt))
    .limit(pageSize)
    .offset(offset)

  const contacts = results.map((row) => parseContact(row))

  return {
    contacts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getContact(id: string): Promise<ContactDetail | null> {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  const result = await db.query.Contacts.findFirst({
    where: eq(Contacts.id, id),
  })

  if (!result) {
    return null
  }

  let emails: string[] = []
  let phoneNumbers: string[] = []

  try {
    emails = JSON.parse(result.emails)
  } catch {}

  try {
    phoneNumbers = JSON.parse(result.phoneNumbers)
  } catch {}

  return {
    id: result.id,
    contactId: result.contactId,
    firstName: result.firstName,
    lastName: result.lastName,
    organization: result.organization,
    emails,
    phoneNumbers,
    deviceId: result.deviceId,
    syncTime: result.syncTime,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  }
}

export async function deleteAllContacts() {
  if (!(await isAuthenticated())) {
    unauthorized()
  }

  await db.delete(Contacts)
}

function parseContact(row: typeof Contacts.$inferSelect): Contact {
  let emails: string[] = []
  let phoneNumbers: string[] = []

  try {
    emails = JSON.parse(row.emails)
  } catch {}

  try {
    phoneNumbers = JSON.parse(row.phoneNumbers)
  } catch {}

  return {
    id: row.id,
    contactId: row.contactId,
    firstName: row.firstName,
    lastName: row.lastName,
    organization: row.organization,
    emails,
    phoneNumbers,
  }
}
