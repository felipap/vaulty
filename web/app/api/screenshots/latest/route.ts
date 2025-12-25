import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { desc } from "drizzle-orm"

function validateAuth(request: NextRequest): boolean {
  const expected = process.env.DEVICE_SECRET
  if (!expected) {
    return true
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return false
  }

  const token = authHeader.slice(7)
  return token === expected
}

export async function GET(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const screenshot = await db.query.Screenshots.findFirst({
    orderBy: desc(Screenshots.capturedAt),
  })

  if (!screenshot) {
    return NextResponse.json({ error: "No screenshots found" }, { status: 404 })
  }

  return NextResponse.json({
    id: screenshot.id,
    data: screenshot.data,
    width: screenshot.width,
    height: screenshot.height,
    sizeBytes: screenshot.sizeBytes,
    capturedAt: screenshot.capturedAt,
  })
}



