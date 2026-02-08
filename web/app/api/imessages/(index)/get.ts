import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"
import { and, eq, gte } from "drizzle-orm"
import { NextRequest } from "next/server"

const MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) { return auth.response }

  console.log("GET /api/imessages")

  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit") || "20"
  const offsetParam = searchParams.get("offset")
  const afterParam = searchParams.get("after")
  const contactParam = searchParams.get("contact")

  const limit = parseInt(limitParam, 10)
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  if (isNaN(limit) || limit < 1) {
    return Response.json(
      { error: "limit must be a positive integer" },
      { status: 400 }
    )
  }

  if (limit > MAX_LIMIT) {
    return Response.json(
      { error: `limit must not exceed ${MAX_LIMIT}` },
      { status: 400 }
    )
  }

  if (isNaN(offset) || offset < 0) {
    return Response.json(
      { error: "offset must be a non-negative integer" },
      { status: 400 }
    )
  }

  const conditions = [eq(iMessages.userId, DEFAULT_USER_ID)]

  if (contactParam) {
    conditions.push(eq(iMessages.contact, contactParam))
  }

  if (afterParam) {
    const afterDate = new Date(afterParam)
    if (isNaN(afterDate.getTime())) {
      return Response.json(
        { error: 'Invalid date format for "after" parameter' },
        { status: 400 }
      )
    }
    conditions.push(gte(iMessages.date, afterDate))
  }

  const messages = await db.query.iMessages.findMany({
    where: and(...conditions),
    orderBy: (iMessages, { asc }) => [asc(iMessages.date)],
    limit,
    offset,
  })

  console.info(
    `Retrieved ${messages.length} iMessages${contactParam ? ` for contact ${contactParam}` : ""}`
  )

  await logRead({
    type: "imessage",
    description: contactParam
      ? `Fetched messages for ${contactParam}`
      : "Fetched messages",
    count: messages.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    messages,
    count: messages.length,
    page: {
      limit,
      offset,
    },
  })
}
