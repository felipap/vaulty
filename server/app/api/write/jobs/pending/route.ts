import { db } from "@/db"
import { WriteJobs } from "@/db/schema"
import { requireWriteAuth } from "@/lib/api-auth"
import { eq, sql } from "drizzle-orm"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const authError = await requireWriteAuth(request)
  if (authError) {
    return authError
  }

  const deviceId = request.headers.get("x-device-id")
  if (!deviceId) {
    return Response.json(
      { error: "Missing x-device-id header" },
      { status: 400 }
    )
  }

  const claimed = await db
    .update(WriteJobs)
    .set({
      status: "claimed",
      claimedAt: new Date(),
      claimedByDeviceId: deviceId,
    })
    .where(
      eq(
        WriteJobs.id,
        sql`(SELECT id FROM write_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1)`
      )
    )
    .returning()

  const job = claimed[0] ?? null

  let hasMore = false
  if (job) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(WriteJobs)
      .where(eq(WriteJobs.status, "pending"))
    hasMore = row.count > 0
  }

  return Response.json({ job, hasMore })
}
