import { db } from "@/db"
import { AppleNotes } from "@/db/schema"
import { gte, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logRead, logWrite } from "@/lib/activity-log"
import { getDataWindowCutoff, requireReadAuth, requireWriteAuth } from "@/lib/api-auth"
import { SyncSuccessResponse, SyncErrorResponse, formatZodError } from "@/app/api/types"
import { APPLE_NOTES_ENCRYPTED_COLUMNS, encryptedRequired, encryptedOrEmpty } from "@/lib/encryption-schema"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "apple-notes")
  if (!auth.authorized) {
    return auth.response
  }

  console.log("GET /api/apple-notes")

  const cutoff = getDataWindowCutoff(auth.token)

  const notes = await db.query.AppleNotes.findMany({
    where: cutoff ? gte(AppleNotes.updatedAt, cutoff) : undefined,
    orderBy: (n, { desc }) => [desc(n.updatedAt)],
  })

  console.info(`Retrieved ${notes.length} Apple Notes`)

  await logRead({
    type: "apple-note",
    description: "Fetched Apple Notes",
    count: notes.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    notes,
    count: notes.length,
  })
}

const NoteSchema = z.object({
  id: z.number(),
  title: encryptedRequired,
  body: encryptedOrEmpty,
  folderName: z.string().nullable(),
  accountName: z.string().nullable(),
  isPinned: z.boolean(),
  createdAt: z.string(),
  modifiedAt: z.string(),
})

type ValidatedNote = z.infer<typeof NoteSchema>

const PostSchema = z.object({
  notes: z.array(z.unknown()),
  syncTime: z.string().optional(),
  deviceId: z.string().optional(),
})

function validateNotes(notes: unknown[]) {
  const validNotes: ValidatedNote[] = []
  const rejectedNotes: Array<{ index: number; note: unknown; error: string }> = []

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]
    const result = NoteSchema.safeParse(note)

    if (!result.success) {
      const error = formatZodError(result.error)
      rejectedNotes.push({ index: i, note, error })
      console.warn(`Rejected Apple Note at index ${i}:`, JSON.stringify({ error }))
      continue
    }

    validNotes.push(result.data)
  }

  return { validNotes, rejectedNotes }
}

export async function POST(request: NextRequest) {
  console.log("POST /api/apple-notes")

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
    notes,
    syncTime = new Date().toISOString(),
    deviceId = "unknown",
  } = parsed.data

  console.log(
    `Received ${notes.length} Apple Notes from device ${deviceId}`
  )

  if (notes.length === 0) {
    return NextResponse.json<SyncSuccessResponse>({
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      rejectedCount: 0,
      skippedCount: 0,
    })
  }

  const { validNotes, rejectedNotes } = validateNotes(notes)

  const values = validNotes.map((n) => ({
    noteId: n.id,
    title: n.title,
    body: n.body,
    folderName: n.folderName,
    accountName: n.accountName,
    isPinned: n.isPinned,
    noteCreatedAt: n.createdAt,
    noteModifiedAt: n.modifiedAt,
    deviceId,
    syncTime: new Date(syncTime),
  }))

  let upsertedCount = 0

  const BATCH_SIZE = 50
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE)
    const result = await db
      .insert(AppleNotes)
      .values(batch)
      .onConflictDoUpdate({
        target: AppleNotes.noteId,
        set: {
          title: sql`excluded.title`,
          body: sql`excluded.body`,
          folderName: sql`excluded.folder_name`,
          accountName: sql`excluded.account_name`,
          isPinned: sql`excluded.is_pinned`,
          noteCreatedAt: sql`excluded.note_created_at`,
          noteModifiedAt: sql`excluded.note_modified_at`,
          deviceId: sql`excluded.device_id`,
          syncTime: sql`excluded.sync_time`,
          updatedAt: new Date(),
        },
      })
      .returning()

    upsertedCount += result.length
  }

  console.info(`Synced ${upsertedCount} Apple Notes`)
  console.info(`Rejected ${rejectedNotes.length} invalid Apple Notes`)

  if (upsertedCount > 0) {
    await logWrite({
      type: "apple-note",
      description: `Synced encrypted Apple Notes from ${deviceId}`,
      count: upsertedCount,
      metadata: {
        rejectedCount: rejectedNotes.length,
        encrypted: true,
        encryptedColumns: APPLE_NOTES_ENCRYPTED_COLUMNS,
      },
    })
  }

  return NextResponse.json<SyncSuccessResponse>({
    success: true,
    insertedCount: upsertedCount,
    updatedCount: 0,
    rejectedCount: rejectedNotes.length,
    skippedCount: 0,
  })
}
