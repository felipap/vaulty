import { db } from "@/db"
import { AppleContacts, DEFAULT_USER_ID } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { and, eq, gte } from "drizzle-orm"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "contacts")
  if (!auth.authorized) {
    return auth.response
  }

  console.log("GET /api/apple-contacts")

  const conditions = [eq(AppleContacts.userId, DEFAULT_USER_ID)]
  const cutoff = getDataWindowCutoff(auth.token)
  if (cutoff) {
    conditions.push(gte(AppleContacts.updatedAt, cutoff))
  }

  const contacts = await db.query.AppleContacts.findMany({
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
