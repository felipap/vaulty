import { db } from "@/db"
import { AppleContacts, DEFAULT_USER_ID } from "@/db/schema"
import { and, asc, eq, gte, or, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "contacts")
  if (!auth.authorized) {
    return auth.response
  }

  const searchParams = request.nextUrl.searchParams
  const firstNameIndex = searchParams.get("firstNameIndex")
  const lastNameIndex = searchParams.get("lastNameIndex")
  const phoneNumberIndex = searchParams.get("phoneNumberIndex")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  if (!firstNameIndex && !lastNameIndex && !phoneNumberIndex) {
    return Response.json(
      {
        error:
          "firstNameIndex, lastNameIndex, or phoneNumberIndex parameter is required",
      },
      { status: 400 }
    )
  }

  const cutoff = getDataWindowCutoff(auth.token)
  const whereConditions = [
    eq(AppleContacts.userId, DEFAULT_USER_ID),
    or(
      firstNameIndex
        ? eq(AppleContacts.firstNameIndex, firstNameIndex)
        : undefined,
      lastNameIndex
        ? eq(AppleContacts.lastNameIndex, lastNameIndex)
        : undefined,
      phoneNumberIndex
        ? sql`EXISTS (SELECT 1 FROM json_each(${AppleContacts.phoneNumbersIndex}) WHERE value = ${phoneNumberIndex})`
        : undefined
    ),
  ]
  if (cutoff) {
    whereConditions.push(gte(AppleContacts.updatedAt, cutoff))
  }

  const contacts = await db.query.AppleContacts.findMany({
    where: and(...whereConditions),
    orderBy: asc(AppleContacts.updatedAt),
    limit,
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

  await logRead({
    type: "contact",
    description: `Searched contacts by ${firstNameIndex || lastNameIndex ? "name" : "phone"} index`,
    count: parsed.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    contacts: parsed,
    count: parsed.length,
  })
}
