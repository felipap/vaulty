import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { parsePagination } from "@/lib/pagination"
import { rejectUnknownParams } from "@/lib/validate-params"
import { and, eq, gte } from "drizzle-orm"
import { NextRequest } from "next/server"

const ALLOWED_PARAMS = ["limit", "offset", "after", "contactIndex"]

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) {
    return auth.response
  }

  console.log("GET /api/imessages")

  const { searchParams } = new URL(request.url)

  const unknownParamsError = rejectUnknownParams(searchParams, ALLOWED_PARAMS)
  if (unknownParamsError) {
    return unknownParamsError
  }

  const pagination = parsePagination(searchParams)
  if (!pagination.ok) {
    return pagination.response
  }
  const { limit, offset } = pagination.params

  const afterParam = searchParams.get("after")
  const contactIndexParam = searchParams.get("contactIndex")

  const conditions = [eq(iMessages.userId, DEFAULT_USER_ID)]

  if (contactIndexParam) {
    conditions.push(eq(iMessages.contactIndex, contactIndexParam))
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

  const cutoff = getDataWindowCutoff(auth.token)
  if (cutoff) {
    conditions.push(gte(iMessages.date, cutoff))
  }

  const messages = await db.query.iMessages.findMany({
    where: and(...conditions),
    orderBy: (iMessages, { asc }) => [asc(iMessages.date)],
    limit,
    offset,
  })

  console.info(
    `Retrieved ${messages.length} iMessages${contactIndexParam ? ` for contactIndex ${contactIndexParam}` : ""}`
  )

  await logRead({
    type: "imessage",
    description: contactIndexParam
      ? `Fetched messages by contactIndex`
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
