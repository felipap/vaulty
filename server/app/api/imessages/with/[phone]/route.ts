import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages } from "@/db/schema"
import { and, desc, eq, gte } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { parsePagination } from "@/lib/pagination"
import { rejectUnknownParams } from "@/lib/validate-params"

const ALLOWED_PARAMS = ["limit", "offset"]

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) {
    return auth.response
  }

  const url = new URL(request.url)
  const phone = url.pathname.split("/").pop()

  if (!phone) {
    return Response.json({ error: "Phone number is required" }, { status: 400 })
  }

  const unknownParamsError = rejectUnknownParams(url.searchParams, ALLOWED_PARAMS)
  if (unknownParamsError) {
    return unknownParamsError
  }

  const pagination = parsePagination(url.searchParams)
  if (!pagination.ok) {
    return pagination.response
  }
  const { limit, offset } = pagination.params

  const contactIndex = decodeURIComponent(phone)
  const cutoff = getDataWindowCutoff(auth.token)
  const messages = await getMessagesWithContactIndex(
    contactIndex,
    limit,
    offset,
    cutoff
  )

  await logRead({
    type: "imessage",
    description: `Fetched conversation by contactIndex`,
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

async function getMessagesWithContactIndex(
  contactIndex: string,
  limit: number,
  offset: number,
  cutoff: Date | null
) {
  const conditions = [
    eq(iMessages.userId, DEFAULT_USER_ID),
    eq(iMessages.contactIndex, contactIndex),
  ]
  if (cutoff) {
    conditions.push(gte(iMessages.date, cutoff))
  }

  const messages = await db.query.iMessages.findMany({
    where: and(...conditions),
    orderBy: [desc(iMessages.date)],
    limit,
    offset,
  })

  return messages
}
