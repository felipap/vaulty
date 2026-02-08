import { db } from "@/db"
import { Contacts, DEFAULT_USER_ID } from "@/db/schema"
import { and, eq, ilike, or, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "contacts")
  if (!auth.authorized) { return auth.response }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")?.trim() || ""
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  if (!query) {
    return Response.json(
      { error: "Search query 'q' is required" },
      { status: 400 }
    )
  }

  const searchPattern = `%${query}%`
  const startsWithPattern = `${query}%`
  const lowerQuery = query.toLowerCase()

  // Full name with NULL handling
  const fullName = sql`COALESCE(${Contacts.firstName}, '') || ' ' || COALESCE(${Contacts.lastName}, '')`

  // Relevance: exact match (3) > starts with (2) > contains (1)
  const relevanceScore = sql<number>`
    CASE
      WHEN LOWER(COALESCE(${Contacts.firstName}, '')) = ${lowerQuery}
        OR LOWER(COALESCE(${Contacts.lastName}, '')) = ${lowerQuery} THEN 3
      WHEN LOWER(COALESCE(${Contacts.firstName}, '')) LIKE ${startsWithPattern.toLowerCase()}
        OR LOWER(COALESCE(${Contacts.lastName}, '')) LIKE ${startsWithPattern.toLowerCase()} THEN 2
      ELSE 1
    END
  `

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
    .where(
      and(
        eq(Contacts.userId, DEFAULT_USER_ID),
        or(
          ilike(Contacts.firstName, searchPattern),
          ilike(Contacts.lastName, searchPattern),
          ilike(Contacts.organization, searchPattern),
          ilike(fullName, searchPattern)
        )
      )
    )
    .orderBy(sql`${relevanceScore} DESC`, Contacts.firstName, Contacts.lastName)
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
    description: `Searched contacts for "${query}"`,
    count: parsed.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    contacts: parsed,
    count: parsed.length,
    query,
  })
}
