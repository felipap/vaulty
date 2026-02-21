import {
  SyncErrorResponse,
  SyncSuccessResponse,
  formatZodError,
} from "@/app/api/types"
import { db } from "@/db"
import { AppleReminders } from "@/db/schema"
import { logRead, logWrite } from "@/lib/activity-log"
import {
  getDataWindowCutoff,
  requireReadAuth,
  requireWriteAuth,
} from "@/lib/api-auth"
import {
  APPLE_REMINDERS_ENCRYPTED_COLUMNS,
  encryptedOrEmpty,
  encryptedRequired,
} from "@/lib/encryption-schema"
import { gte, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export async function GET(request: NextRequest) {
  const auth = await requireReadAuth(request, "apple-reminders")
  if (!auth.authorized) {
    return auth.response
  }

  const cutoff = getDataWindowCutoff(auth.token)

  const reminders = await db.query.AppleReminders.findMany({
    where: cutoff ? gte(AppleReminders.updatedAt, cutoff) : undefined,
    orderBy: (r, { desc }) => [desc(r.updatedAt)],
  })

  await logRead({
    type: "apple-reminder",
    description: "Fetched Apple Reminders",
    count: reminders.length,
    token: auth.token,
  })

  return Response.json({
    success: true,
    reminders,
    count: reminders.length,
  })
}

const ReminderSchema = z.object({
  id: z.string(),
  title: encryptedRequired,
  notes: encryptedOrEmpty.nullable(),
  listName: encryptedOrEmpty.nullable(),
  completed: z.boolean(),
  flagged: z.boolean(),
  priority: z.number(),
  dueDate: z.string().nullable(),
  completionDate: z.string().nullable(),
  creationDate: z.string().nullable(),
  lastModifiedDate: z.string().nullable(),
})

type ValidatedReminder = z.infer<typeof ReminderSchema>

const PostSchema = z.object({
  reminders: z.array(z.unknown()),
  syncTime: z.string().optional(),
  deviceId: z.string().optional(),
})

function validateReminders(reminders: unknown[]) {
  const validReminders: ValidatedReminder[] = []
  const rejectedReminders: Array<{ index: number; reminder: unknown; error: string }> = []

  for (let i = 0; i < reminders.length; i++) {
    const reminder = reminders[i]
    const result = ReminderSchema.safeParse(reminder)

    if (!result.success) {
      const error = formatZodError(result.error)
      rejectedReminders.push({ index: i, reminder, error })
      console.warn(`Rejected Apple Reminder at index ${i}:`, JSON.stringify({ error }))
      continue
    }

    validReminders.push(result.data)
  }

  return { validReminders, rejectedReminders }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireWriteAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const json = await request.json()

  const parsed = PostSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json<SyncErrorResponse>(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const {
    reminders,
    syncTime = new Date().toISOString(),
    deviceId = "unknown",
  } = parsed.data

  if (reminders.length === 0) {
    return NextResponse.json<SyncSuccessResponse>({
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      rejectedCount: 0,
      skippedCount: 0,
    })
  }

  const { validReminders, rejectedReminders } = validateReminders(reminders)

  const values = validReminders.map((r) => ({
    reminderId: r.id,
    title: r.title,
    notes: r.notes,
    listName: r.listName,
    completed: r.completed,
    flagged: r.flagged,
    priority: r.priority,
    dueDate: r.dueDate ? new Date(r.dueDate) : null,
    completionDate: r.completionDate ? new Date(r.completionDate) : null,
    reminderCreatedAt: r.creationDate ? new Date(r.creationDate) : null,
    reminderModifiedAt: r.lastModifiedDate
      ? new Date(r.lastModifiedDate)
      : null,
    deviceId,
    syncTime: new Date(syncTime),
  }))

  let upsertedCount = 0

  const BATCH_SIZE = 50
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE)
    const result = await db
      .insert(AppleReminders)
      .values(batch)
      .onConflictDoUpdate({
        target: AppleReminders.reminderId,
        set: {
          title: sql`excluded.title`,
          notes: sql`excluded.notes`,
          listName: sql`excluded.list_name`,
          completed: sql`excluded.completed`,
          flagged: sql`excluded.flagged`,
          priority: sql`excluded.priority`,
          dueDate: sql`excluded.due_date`,
          completionDate: sql`excluded.completion_date`,
          reminderCreatedAt: sql`excluded.reminder_created_at`,
          reminderModifiedAt: sql`excluded.reminder_modified_at`,
          deviceId: sql`excluded.device_id`,
          syncTime: sql`excluded.sync_time`,
          updatedAt: new Date(),
        },
      })
      .returning()

    upsertedCount += result.length
  }

  console.info(`Synced ${upsertedCount} Apple Reminders`)
  console.info(`Rejected ${rejectedReminders.length} invalid Apple Reminders`)

  if (upsertedCount > 0) {
    await logWrite({
      type: "apple-reminder",
      description: `Synced encrypted Apple Reminders from ${deviceId}`,
      count: upsertedCount,
      metadata: {
        rejectedCount: rejectedReminders.length,
        encrypted: true,
        encryptedColumns: APPLE_REMINDERS_ENCRYPTED_COLUMNS,
      },
    })
  }

  return NextResponse.json<SyncSuccessResponse>({
    success: true,
    insertedCount: upsertedCount,
    updatedCount: 0,
    rejectedCount: rejectedReminders.length,
    skippedCount: 0,
  })
}
