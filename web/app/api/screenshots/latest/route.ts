import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"
import { desc, gte } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "screenshots")
  if (!auth.authorized) { return auth.response }

  const { searchParams } = new URL(request.url)
  const withinMinParam = searchParams.get("within_min")
  const withinMin = withinMinParam ? parseInt(withinMinParam, 10) : null

  if (withinMinParam !== null && (isNaN(withinMin!) || withinMin! < 1)) {
    return NextResponse.json(
      { error: "within_min must be a positive integer" },
      { status: 400 }
    )
  }

  let where
  if (withinMin) {
    const cutoff = new Date(Date.now() - withinMin * 60 * 1000)
    where = gte(Screenshots.capturedAt, cutoff)
  }

  const screenshot = await db.query.Screenshots.findFirst({
    where,
    orderBy: desc(Screenshots.capturedAt),
  })

  await logRead({
    type: "screenshot",
    description: "Fetched latest screenshot",
    count: screenshot ? 1 : 0,
    token: auth.token,
  })

  if (!screenshot) {
    return NextResponse.json({ screenshot: null })
  }

  return NextResponse.json({
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
