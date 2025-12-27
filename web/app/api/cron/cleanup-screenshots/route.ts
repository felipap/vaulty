import { NextResponse } from "next/server"
import { lt } from "drizzle-orm"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"

const CRON_SECRET = process.env.CRON_SECRET
if (!CRON_SECRET) {
  throw new Error("CRON_SECRET environment variable is not set")
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const result = await db
    .delete(Screenshots)
    .where(lt(Screenshots.capturedAt, oneHourAgo))
    .returning({ id: Screenshots.id })

  return NextResponse.json({
    success: true,
    deletedCount: result.length,
    cutoffTime: oneHourAgo.toISOString(),
  })
}
