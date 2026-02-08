import { db } from "@/db"
import { Contacts, DEFAULT_USER_ID } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request)
  if (!auth.authorized) { return auth.response }

  const url = new URL(request.url)
  const phone = url.pathname.split("/").pop()

  if (!phone) {
    return Response.json({ error: "Phone number is required" }, { status: 400 })
  }

  const decodedPhone = decodeURIComponent(phone)
  const normalizedPhone = normalizePhone(decodedPhone)

  const contacts = await db.query.Contacts.findMany({
    where: eq(Contacts.userId, DEFAULT_USER_ID),
  })

  const matchingContact = contacts.find((contact) => {
    const phoneNumbers = JSON.parse(contact.phoneNumbers) as string[]
    return phoneNumbers.some((p) => normalizePhone(p) === normalizedPhone)
  })

  if (!matchingContact) {
    await logRead({
      type: "contact",
      description: `Contact not found for phone: ${decodedPhone}`,
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
    description: `Fetched contact by phone: ${decodedPhone}`,
    count: 1,
    token: auth.token,
  })

  return Response.json({
    success: true,
    contact: parsed,
  })
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}
