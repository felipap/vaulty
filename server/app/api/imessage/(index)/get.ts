import { db } from "@/db"
import { DEFAULT_USER_ID, iMessages } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { paginationSchema, parseSearchParams } from "@/lib/validate-params"
import { and, eq, gte } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"

const searchParamsSchema = z.object({
  ...paginationSchema,
  after: z.coerce.date().optional(),
  contactIndex: z.string().optional(),
}).strict()

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "imessages")
  if (!auth.authorized) {
    return auth.response
  }

  console.log("GET /api/imessage")

  const result = parseSearchParams(new URL(request.url).searchParams, searchParamsSchema)
  if (!result.ok) {
    return result.response
  }
  const { limit, offset, after, contactIndex } = result.params

  const conditions = [eq(iMessages.userId, DEFAULT_USER_ID)]

  if (contactIndex) {
    conditions.push(eq(iMessages.contactIndex, contactIndex))
  }

  if (after) {
    conditions.push(gte(iMessages.date, after))
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
    `Retrieved ${messages.length} iMessages${contactIndex ? ` for contactIndex ${contactIndex}` : ""}`
  )

  await logRead({
    type: "imessage",
    description: contactIndex
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
