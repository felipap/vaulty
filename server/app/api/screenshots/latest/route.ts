import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { parseSearchParams } from "@/lib/validate-params"
import { and, desc, gte } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const searchParamsSchema = z.object({
  within_min: z.coerce.number().int().min(1).optional(),
}).strict()

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "screenshots")
  if (!auth.authorized) {
    return auth.response
  }

  const result = parseSearchParams(new URL(request.url).searchParams, searchParamsSchema)
  if (!result.ok) {
    return result.response
  }
  const { within_min } = result.params

  const conditions = []
  if (within_min) {
    const cutoff = new Date(Date.now() - within_min * 60 * 1000)
    conditions.push(gte(Screenshots.capturedAt, cutoff))
  }
  const windowCutoff = getDataWindowCutoff(auth.token)
  if (windowCutoff) {
    conditions.push(gte(Screenshots.capturedAt, windowCutoff))
  }

  const screenshot = await db.query.Screenshots.findFirst({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(Screenshots.capturedAt),
  })

  await logRead({
    type: "screenshot",
    description: "Fetched latest screenshot",
    count: screenshot ? 1 : 0,
    token: auth.token,
  })

  if (!screenshot) {
    return NextResponse.json({ success: true, screenshot: null })
  }

  return NextResponse.json({
    success: true,
    screenshot: {
      id: screenshot.id,
      data: screenshot.data,
      width: screenshot.width,
      height: screenshot.height,
      sizeBytes: screenshot.sizeBytes,
      capturedAt: screenshot.capturedAt,
    },
    metadata: {
      ageMs: Date.now() - screenshot.capturedAt.getTime(),
    },
  })
}
