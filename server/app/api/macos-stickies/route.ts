import { db } from "@/db"
import { MacosStickies } from "@/db/schema"
import { gte, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logRead, logWrite } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth, requireWriteAuth } from "@/lib/api-auth"
import { SyncSuccessResponse, SyncErrorResponse, formatZodError } from "@/app/api/types"
import { MACOS_STICKIES_ENCRYPTED_COLUMNS, encryptedRequired } from "@/lib/encryption-schema"

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
  text: encryptedRequired,
})

type ValidatedSticky = z.infer<typeof StickySchema>

const PostSchema = z.object({
  stickies: z.array(z.unknown()),
  syncTime: z.string().optional(),
  deviceId: z.string().optional(),
})

function validateStickies(stickies: unknown[]) {
  const validStickies: ValidatedSticky[] = []
  const rejectedStickies: Array<{ index: number; sticky: unknown; error: string }> = []

  for (let i = 0; i < stickies.length; i++) {
    const sticky = stickies[i]
    const result = StickySchema.safeParse(sticky)

    if (!result.success) {
      const error = formatZodError(result.error)
      rejectedStickies.push({ index: i, sticky, error })
      console.warn(`Rejected macOS sticky at index ${i}:`, JSON.stringify({ error }))
      continue
    }

    validStickies.push(result.data)
  }

  return { validStickies, rejectedStickies }
}

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
    return NextResponse.json<SyncErrorResponse>(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
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
    return NextResponse.json<SyncSuccessResponse>({
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      rejectedCount: 0,
      skippedCount: 0,
    })
  }

  const { validStickies, rejectedStickies } = validateStickies(stickies)

  const values = validStickies.map((s) => ({
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
          updatedAt: new Date(),
        },
      })
      .returning()

    upsertedCount += result.length
  }

  console.info(`Synced ${upsertedCount} macOS stickies`)
  console.info(`Rejected ${rejectedStickies.length} invalid macOS stickies`)

  if (upsertedCount > 0) {
    await logWrite({
      type: "macos-sticky",
      description: `Synced encrypted macOS stickies from ${deviceId}`,
      count: upsertedCount,
      metadata: {
        rejectedCount: rejectedStickies.length,
        encrypted: true,
        encryptedColumns: MACOS_STICKIES_ENCRYPTED_COLUMNS,
      },
    })
  }

  return NextResponse.json<SyncSuccessResponse>({
    success: true,
    insertedCount: upsertedCount,
    updatedCount: 0,
    rejectedCount: rejectedStickies.length,
    skippedCount: 0,
  })
}
