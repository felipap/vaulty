import { db } from "@/db"
import { Contacts, DEFAULT_USER_ID } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"
import { logRead, logWrite } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "contacts")
  if (!auth.authorized) { return auth.response }

  console.log("GET /api/contacts")

  const contacts = await db.query.Contacts.findMany({
    where: eq(Contacts.userId, DEFAULT_USER_ID),
    orderBy: (contacts, { asc }) => [asc(contacts.firstName), asc(contacts.lastName)],
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
  organization: z.string().nullable(),
  emails: z.array(z.string()),
  phoneNumbers: z.array(z.string()),
})

const PostSchema = z.object({
  contacts: z.array(ContactSchema),
  syncTime: z.string().optional(),
  deviceId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  console.log("POST /api/contacts")

  const json = await request.json()

  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    console.warn("Invalid request body", { error: parsed.error })
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  const { contacts, syncTime = new Date().toISOString(), deviceId = "unknown" } = parsed.data

  console.log(`Received ${contacts.length} contacts from device ${deviceId}`)

  if (contacts.length === 0) {
    return Response.json({
      success: true,
      message: "No contacts to sync",
      contactCount: 0,
      syncedAt: new Date().toISOString(),
    })
  }

  const BATCH_SIZE = 50
  let insertedCount = 0

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE)
    const batchValues = batch.map((c) => ({
      userId: DEFAULT_USER_ID,
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      organization: c.organization,
      emails: JSON.stringify(c.emails),
      phoneNumbers: JSON.stringify(c.phoneNumbers),
      deviceId,
      syncTime: new Date(syncTime),
    }))

    const result = await db
      .insert(Contacts)
      .values(batchValues)
      .onConflictDoUpdate({
        target: [Contacts.userId, Contacts.contactId],
        set: {
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          organization: sql`excluded.organization`,
          emails: sql`excluded.emails`,
          phoneNumbers: sql`excluded.phone_numbers`,
          deviceId: sql`excluded.device_id`,
          syncTime: sql`excluded.sync_time`,
          updatedAt: sql`now()`,
        },
      })
      .returning()

    insertedCount += result.length
  }

  console.info(`Synced ${insertedCount} contacts`)

  if (insertedCount > 0) {
    await logWrite({
      type: "contact",
      description: `Synced contacts from ${deviceId}`,
      count: insertedCount,
    })
  }

  return Response.json({
    success: true,
    message: `Synced ${insertedCount} contacts`,
    contactCount: insertedCount,
    syncedAt: new Date().toISOString(),
  })
}
