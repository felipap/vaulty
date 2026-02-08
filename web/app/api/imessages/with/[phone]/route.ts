import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages } from "@/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) { return auth.response }

  const url = new URL(request.url)
  const phone = url.pathname.split("/").pop()

  if (!phone) {
    return Response.json({ error: "Phone number is required" }, { status: 400 })
  }

  const { searchParams } = url
  const limitParam = searchParams.get("limit")
  const offsetParam = searchParams.get("offset")

  if (!limitParam) {
    return Response.json(
      { error: "limit query parameter is required" },
      { status: 400 }
    )
  }

  const limit = parseInt(limitParam, 10)
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  const MAX_LIMIT = 50

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

  const decodedPhone = decodeURIComponent(phone)
  const messages = await getMessagesWithContact(decodedPhone, limit, offset)

  await logRead({
    type: "imessage",
    description: `Fetched conversation with ${decodedPhone}`,
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

async function getMessagesWithContact(
  contact: string,
  limit: number,
  offset: number
) {
  const messages = await db.query.iMessages.findMany({
    where: and(
      eq(iMessages.userId, DEFAULT_USER_ID),
      eq(iMessages.contact, contact)
    ),
    orderBy: [desc(iMessages.date)],
    limit,
    offset,
  })

  return messages
}
