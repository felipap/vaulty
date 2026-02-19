import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth } from "@/lib/api-auth"
import { and, desc, gte } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "screenshots")
  if (!auth.authorized) {
    return auth.response
  }

  const { searchParams } = new URL(request.url)
  const withinMinParam = searchParams.get("within_min")
  const withinMin = withinMinParam ? parseInt(withinMinParam, 10) : null

  if (withinMinParam !== null && (isNaN(withinMin!) || withinMin! < 1)) {
    return NextResponse.json(
      { error: "within_min must be a positive integer" },
      { status: 400 }
    )
  }

  const conditions = []
  if (withinMin) {
    const cutoff = new Date(Date.now() - withinMin * 60 * 1000)
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
