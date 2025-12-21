import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { Screenshots } from "@/db/schema"
import { sql, desc } from "drizzle-orm"

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [countResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalBytes: sql<number>`coalesce(sum(${Screenshots.sizeBytes}), 0)::int`,
    })
    .from(Screenshots)

  const recentScreenshots = await db.query.Screenshots.findMany({
    orderBy: desc(Screenshots.capturedAt),
    limit: 10,
    columns: {
      id: true,
      width: true,
      height: true,
      sizeBytes: true,
      capturedAt: true,
    },
  })

  return NextResponse.json({
    totalScreenshots: countResult.count,
    totalStorageBytes: countResult.totalBytes,
    recentScreenshots,
  })
}
