import {
  SyncErrorResponse,
  SyncSuccessResponse,
  formatZodError,
  summarizeZodError,
} from "@/app/api/types"
import { db } from "@/db"
import { AppleContacts, DEFAULT_USER_ID } from "@/db/schema"
import { logWrite } from "@/lib/activity-log"
import {
  CONTACT_ENCRYPTED_COLUMNS,
  encryptedOrEmpty,
  encryptedRequired,
} from "@/lib/encryption-schema"
import { sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const MAX_CONTACTS = 100

const ContactSchema = z.object({
  id: z.string(),
  firstName: encryptedRequired,
  lastName: encryptedOrEmpty.nullable(),
  firstNameIndex: z.string().nullable().optional(),
  lastNameIndex: z.string().nullable().optional(),
  organization: encryptedOrEmpty.nullable(),
  emails: z.array(encryptedRequired),
  phoneNumbers: z.array(encryptedRequired),
  phoneNumbersIndex: z.array(z.string()).nullable().optional(),
})

const PostSchema = z.object({
  contacts: z.array(ContactSchema),
  syncTime: z.string().optional(),
  deviceId: z.string().optional(),
})

type ValidatedContact = z.infer<typeof ContactSchema>

type InsertResult = {
  insertedCount: number
  updatedCount: number
}

export async function POST(request: NextRequest) {
  console.log("POST /api/apple-contacts")

  const json = await request.json()

  if (Array.isArray(json.contacts) && json.contacts.length > MAX_CONTACTS) {
    console.warn(
      `Received ${json.contacts.length} contacts, max is ${MAX_CONTACTS}`
    )
    return NextResponse.json<SyncErrorResponse>(
      { error: `Cannot sync more than ${MAX_CONTACTS} contacts per request` },
      { status: 400 }
    )
  }

  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    console.warn("Invalid request body:", summarizeZodError(parsed.error))
    return NextResponse.json<SyncErrorResponse>(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const {
    contacts: rawContacts,
    syncTime = new Date().toISOString(),
    deviceId = "unknown",
  } = parsed.data

  // Filter out contacts with no first name
  const contacts = rawContacts.filter((c) => c.firstName)

  console.log(
    `Received ${rawContacts.length} contacts from device ${deviceId} (${rawContacts.length - contacts.length} skipped: no first name)`
  )

  if (contacts.length === 0) {
    return NextResponse.json<SyncSuccessResponse>({
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      rejectedCount: 0,
      skippedCount: 0,
    })
  }

  let insertedCount: number
  let updatedCount: number
  try {
    const result = await insertContactsInBatches(contacts, deviceId, syncTime)
    insertedCount = result.insertedCount
    updatedCount = result.updatedCount
  } catch (error) {
    console.error("Failed to insert contacts:", error)
    return NextResponse.json<SyncErrorResponse>(
      { error: "Failed to insert contacts" },
      { status: 500 }
    )
  }

  console.info(
    `Synced contacts: ${insertedCount} inserted, ${updatedCount} updated`
  )

  if (insertedCount > 0 || updatedCount > 0) {
    await logWrite({
      type: "contact",
      description: `Synced encrypted contacts from ${deviceId}`,
      count: insertedCount + updatedCount,
      metadata: {
        updatedCount,
        encrypted: true,
        encryptedColumns: CONTACT_ENCRYPTED_COLUMNS,
      },
    })
  }

  return NextResponse.json<SyncSuccessResponse>({
    success: true,
    insertedCount,
    updatedCount,
    rejectedCount: 0,
    skippedCount: 0,
  })
}

async function insertContactsInBatches(
  contacts: ValidatedContact[],
  deviceId: string,
  syncTime: string
): Promise<InsertResult> {
  const BATCH_SIZE = 50
  let insertedCount = 0
  let updatedCount = 0

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE)
    const batchCreatedAt = new Date()
    const batchValues = batch.map((c) => ({
      userId: DEFAULT_USER_ID,
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      firstNameIndex: c.firstNameIndex ?? null,
      lastNameIndex: c.lastNameIndex ?? null,
      organization: c.organization,
      emails: JSON.stringify(c.emails),
      phoneNumbers: JSON.stringify(c.phoneNumbers),
      phoneNumbersIndex: c.phoneNumbersIndex ?? null,
      deviceId,
      syncTime: new Date(syncTime),
      createdAt: batchCreatedAt,
    }))

    const result = await db
      .insert(AppleContacts)
      .values(batchValues)
      .onConflictDoUpdate({
        target: [AppleContacts.userId, AppleContacts.contactId],
        set: {
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          firstNameIndex: sql`excluded.first_name_index`,
          lastNameIndex: sql`excluded.last_name_index`,
          organization: sql`excluded.organization`,
          emails: sql`excluded.emails`,
          phoneNumbers: sql`excluded.phone_numbers`,
          phoneNumbersIndex: sql`excluded.phone_numbers_index`,
          deviceId: sql`excluded.device_id`,
          syncTime: sql`excluded.sync_time`,
          updatedAt: new Date(),
        },
      })
      .returning()

    for (const row of result) {
      if (row.createdAt.getTime() === batchCreatedAt.getTime()) {
        insertedCount++
      } else {
        updatedCount++
      }
    }
  }

  return { insertedCount, updatedCount }
}
