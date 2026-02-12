import { db } from "@/db"
import { Contacts, DEFAULT_USER_ID } from "@/db/schema"
import { and, eq, gte, or, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "contacts")
  if (!auth.authorized) {
    return auth.response
  }

  const searchParams = request.nextUrl.searchParams
  const nameIndex = searchParams.get("nameIndex") // HMAC blind index for name
  const phoneNumberIndex = searchParams.get("phoneNumberIndex") // HMAC blind index for phone
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  if (!nameIndex && !phoneNumberIndex) {
    return Response.json(
      { error: "nameIndex or phoneNumberIndex parameter is required" },
      { status: 400 }
    )
  }

  const cutoff = getDataWindowCutoff(auth.token)
  const whereConditions = [
    eq(Contacts.userId, DEFAULT_USER_ID),
    or(
      nameIndex ? eq(Contacts.nameIndex, nameIndex) : undefined,
      phoneNumberIndex
        ? sql`${phoneNumberIndex} = ANY(${Contacts.phoneNumbersIndex})`
        : undefined
    ),
  ]
  if (cutoff) {
    whereConditions.push(gte(Contacts.updatedAt, cutoff))
  }

  const contacts = await db
    .select({
      id: Contacts.id,
      contactId: Contacts.contactId,
      firstName: Contacts.firstName,
      lastName: Contacts.lastName,
      organization: Contacts.organization,
      emails: Contacts.emails,
      phoneNumbers: Contacts.phoneNumbers,
      syncTime: Contacts.syncTime,
      createdAt: Contacts.createdAt,
      updatedAt: Contacts.updatedAt,
    })
    .from(Contacts)
    .where(and(...whereConditions))
    .orderBy(Contacts.updatedAt)
    .limit(limit)

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

  await logRead({
    type: "contact",
    description: `Searched contacts by ${nameIndex ? "name" : "phone"} index`,
    count: parsed.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    contacts: parsed,
    count: parsed.length,
  })
}
