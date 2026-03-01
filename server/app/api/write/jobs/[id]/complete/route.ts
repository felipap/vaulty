import { db } from "@/db"
import { WriteJobs } from "@/db/schema"
import { requireWriteAuth } from "@/lib/api-auth"
import { and, eq } from "drizzle-orm"
import { NextRequest } from "next/server"
import { z } from "zod"

const CompleteSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  deviceId: z.string(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireWriteAuth(request)
  if (authError) {
    return authError
  }

  const { id } = await params

  const json = await request.json()
  const parsed = CompleteSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    )
  }

  const { success, error, deviceId } = parsed.data

  const updated = await db
    .update(WriteJobs)
    .set({
      status: success ? "completed" : "failed",
      completedAt: new Date(),
      error: error ?? null,
    })
    .where(and(eq(WriteJobs.id, id), eq(WriteJobs.claimedByDeviceId, deviceId)))
    .returning()

  if (updated.length === 0) {
    return Response.json(
      { error: "Job not found or not claimed by this device" },
      { status: 409 }
    )
  }

  console.log(
    `Write job ${id} marked as ${success ? "completed" : "failed"}${error ? `: ${error}` : ""}`
  )

  return Response.json({ ok: true })
}
