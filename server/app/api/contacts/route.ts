import {
  SyncErrorResponse,
  SyncSuccessResponse,
  formatZodError,
} from "@/app/api/types"
import { db } from "@/db"
import { Contacts, DEFAULT_USER_ID } from "@/db/schema"
import { logRead, logWrite } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { and, eq, gte, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "contacts")
  if (!auth.authorized) {
    return auth.response
  }

  console.log("GET /api/contacts")

  const conditions = [eq(Contacts.userId, DEFAULT_USER_ID)]
  const cutoff = getDataWindowCutoff(auth.token)
  if (cutoff) {
    conditions.push(gte(Contacts.updatedAt, cutoff))
  }

  const contacts = await db.query.Contacts.findMany({
    where: and(...conditions),
    orderBy: (contacts, { asc }) => [
      asc(contacts.firstName),
      asc(contacts.lastName),
    ],
  })

  const parsed = contacts.map((c) => ({
    id: c.id,
    contactId: c.contactId,
    firstName: c.firstName,
    lastName: c.lastName,
    organization: c.organization,
    emails: JSON.parse(c.emails) as string[],
    phoneNumbers: JSON.parse(c.phoneNumbers) as string[],
    syncTime: c.syncTime,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }))

  console.info(`Retrieved ${parsed.length} contacts`)

  await logRead({
    type: "contact",
    description: "Fetched contacts",
    count: parsed.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    contacts: parsed,
    count: parsed.length,
  })
}

const ContactSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  firstNameIndex: z.string().nullable().optional(), // HMAC blind index for first name search
  lastNameIndex: z.string().nullable().optional(), // HMAC blind index for last name search
  organization: z.string().nullable(),
  emails: z.array(z.string()),
  phoneNumbers: z.array(z.string()),
  phoneNumbersIndex: z.array(z.string()).nullable().optional(), // HMAC blind indexes for phone search
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
  console.log("POST /api/contacts")

  const json = await request.json()

  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    console.warn("Invalid request body", { error: parsed.error })
    return NextResponse.json<SyncErrorResponse>(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const {
    contacts,
    syncTime = new Date().toISOString(),
    deviceId = "unknown",
  } = parsed.data

  console.log(`Received ${contacts.length} contacts from device ${deviceId}`)

  if (contacts.length === 0) {
    return NextResponse.json<SyncSuccessResponse>({
      success: true,
      syncedAt: new Date().toISOString(),
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
      description: `Synced contacts from ${deviceId}`,
      count: insertedCount + updatedCount,
      metadata: { updatedCount },
    })
  }

  return NextResponse.json<SyncSuccessResponse>({
    success: true,
    syncedAt: new Date().toISOString(),
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
      .insert(Contacts)
      .values(batchValues)
      .onConflictDoUpdate({
        target: [Contacts.userId, Contacts.contactId],
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
          updatedAt: sql`now()`,
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
