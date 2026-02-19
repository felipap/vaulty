"use server"

import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { AppleContacts } from "@/db/schema"
import { and, desc, eq, or, sql } from "drizzle-orm"
import { unauthorized } from "next/navigation"

export type Contact = {
  id: string
  contactId: string
  firstName: string
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
  firstNameIndex?: string
  lastNameIndex?: string
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

  const { firstNameIndex, lastNameIndex, phoneNumberIndex } = searchParams
  const hasFirstNameSearch = !!firstNameIndex
  const hasLastNameSearch = !!lastNameIndex
  const hasPhoneSearch = !!phoneNumberIndex
  const hasSearch = hasFirstNameSearch || hasLastNameSearch || hasPhoneSearch

  const searchCondition = hasSearch
    ? or(
        hasFirstNameSearch
          ? eq(AppleContacts.firstNameIndex, firstNameIndex)
          : undefined,
        hasLastNameSearch
          ? eq(AppleContacts.lastNameIndex, lastNameIndex)
          : undefined,
        hasPhoneSearch
          ? sql`EXISTS (SELECT 1 FROM json_each(${AppleContacts.phoneNumbersIndex}) WHERE value = ${phoneNumberIndex})`
          : undefined
      )
    : undefined

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(AppleContacts)
    .where(searchCondition)

  const total = countResult.count

  const results = await db.query.AppleContacts.findMany({
    where: searchCondition,
    orderBy: desc(AppleContacts.updatedAt),
    limit: pageSize,
    offset,
  })

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

  const result = await db.query.AppleContacts.findFirst({
    where: eq(AppleContacts.id, id),
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
    firstName: result.firstName ?? "",
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

  await db.delete(AppleContacts)
}

function parseContact(row: typeof AppleContacts.$inferSelect): Contact {
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
    firstName: row.firstName ?? "",
    lastName: row.lastName,
    organization: row.organization,
    emails,
    phoneNumbers,
  }
}
