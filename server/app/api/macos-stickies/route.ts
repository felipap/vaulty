import { db } from "@/db"
import { MacosStickies } from "@/db/schema"
import { gte, sql } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"
import { logRead, logWrite } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth, requireWriteAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "macos-stickies")
  if (!auth.authorized) {
    return auth.response
  }

  console.log("GET /api/macos-stickies")

  const cutoff = getDataWindowCutoff(auth.token)

  const stickies = await db.query.MacosStickies.findMany({
    where: cutoff ? gte(MacosStickies.updatedAt, cutoff) : undefined,
    orderBy: (s, { desc }) => [desc(s.updatedAt)],
  })

  console.info(`Retrieved ${stickies.length} macOS stickies`)

  await logRead({
    type: "macos-sticky",
    description: "Fetched macOS stickies",
    count: stickies.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    stickies,
    count: stickies.length,
  })
}

const StickySchema = z.object({
  id: z.string(),
  text: z.string(),
})

const PostSchema = z.object({
  stickies: z.array(StickySchema),
  syncTime: z.string().optional(),
  deviceId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  console.log("POST /api/macos-stickies")

  const unauthorized = await requireWriteAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const json = await request.json()

  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    console.warn("Invalid request body", { error: parsed.error })
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  const {
    stickies,
    syncTime = new Date().toISOString(),
    deviceId = "unknown",
  } = parsed.data

  console.log(
    `Received ${stickies.length} macOS stickies from device ${deviceId}`
  )

  if (stickies.length === 0) {
    return Response.json({
      success: true,
      message: "No stickies to sync",
      count: 0,
      syncedAt: new Date().toISOString(),
    })
  }

  const values = stickies.map((s) => ({
    stickyId: s.id,
    text: s.text,
    deviceId,
    syncTime: new Date(syncTime),
  }))

  let upsertedCount = 0

  const BATCH_SIZE = 50
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE)
    const result = await db
      .insert(MacosStickies)
      .values(batch)
      .onConflictDoUpdate({
        target: MacosStickies.stickyId,
        set: {
          text: sql`excluded.text`,
          deviceId: sql`excluded.device_id`,
          syncTime: sql`excluded.sync_time`,
          updatedAt: sql`now()`,
        },
      })
      .returning()

    upsertedCount += result.length
  }

  console.info(`Synced ${upsertedCount} macOS stickies`)

  if (upsertedCount > 0) {
    await logWrite({
      type: "macos-sticky",
      description: `Synced macOS stickies from ${deviceId}`,
      count: upsertedCount,
    })
  }

  return Response.json({
    success: true,
    message: `Synced ${upsertedCount} macOS stickies`,
    count: upsertedCount,
    syncedAt: new Date().toISOString(),
  })
}
