import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { desc } from "drizzle-orm"
import { logRead } from "@/lib/activity-log"
import { protectApiRead } from "../../lib"

export const GET = protectApiRead(async (_request: NextRequest) => {
  const screenshot = await db.query.Screenshots.findFirst({
    orderBy: desc(Screenshots.capturedAt),
  })

  if (!screenshot) {
    return NextResponse.json({ error: "No screenshots found" }, { status: 404 })
  }

  await logRead({
    type: "screenshot",
    description: "Fetched latest screenshot",
    count: 1,
  })

  return NextResponse.json({
    id: screenshot.id,
    data: screenshot.data,
    width: screenshot.width,
    height: screenshot.height,
    sizeBytes: screenshot.sizeBytes,
    capturedAt: screenshot.capturedAt,
  })
})
