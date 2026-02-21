import { db } from "@/db"
import { AppleContacts, DEFAULT_USER_ID } from "@/db/schema"
import { and, eq, gte, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "contacts")
  if (!auth.authorized) {
    return auth.response
  }

  const searchParams = request.nextUrl.searchParams
  const phoneNumberIndex = searchParams.get("phoneNumberIndex") // HMAC blind index

  const url = new URL(request.url)
  const phone = url.pathname.split("/").pop()

  if (!phone && !phoneNumberIndex) {
    return Response.json(
      { error: "Phone number or phoneNumberIndex is required" },
      { status: 400 }
    )
  }

  const decodedPhone = phone ? decodeURIComponent(phone) : ""

  const cutoff = getDataWindowCutoff(auth.token)
  const conditions = [eq(AppleContacts.userId, DEFAULT_USER_ID)]

  if (phoneNumberIndex) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM json_each(${AppleContacts.phoneNumbersIndex}) WHERE value = ${phoneNumberIndex})`
    )
  } else {
    const normalizedPhone = decodedPhone.replace(/\D/g, "")
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM json_each(${AppleContacts.phoneNumbers}) AS j
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(j.value, '-', ''), ' ', ''), '+', ''), '(', '') LIKE '%' || ${normalizedPhone} || '%'
      )`
    )
  }

  if (cutoff) {
    conditions.push(gte(AppleContacts.updatedAt, cutoff))
  }

  const matchingContact = await db.query.AppleContacts.findFirst({
    where: and(...conditions),
  })

  if (!matchingContact) {
    await logRead({
      type: "contact",
      description: phoneNumberIndex
        ? `Contact not found by phone index`
        : `Contact not found for phone: ${decodedPhone}`,
      count: 0,
      token: auth.token,
    })

    return Response.json(
      { success: false, error: "Contact not found" },
      { status: 404 }
    )
  }

  const parsed = {
    id: matchingContact.id,
    contactId: matchingContact.contactId,
    firstName: matchingContact.firstName,
    lastName: matchingContact.lastName,
    organization: matchingContact.organization,
    emails: JSON.parse(matchingContact.emails) as string[],
    phoneNumbers: JSON.parse(matchingContact.phoneNumbers) as string[],
    syncTime: matchingContact.syncTime,
    createdAt: matchingContact.createdAt,
    updatedAt: matchingContact.updatedAt,
  }

  await logRead({
    type: "contact",
    description: phoneNumberIndex
      ? `Fetched contact by phone index`
      : `Fetched contact by phone: ${decodedPhone}`,
    count: 1,
    token: auth.token,
  })

  return Response.json({
    success: true,
    contact: parsed,
  })
}
