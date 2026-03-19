import { db } from "@/db"
import { AppleNotes } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest } from "next/server"
import { logRead } from "@/lib/activity-log"
import { requireReadAuth } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const auth = await requireReadAuth(request, "apple-notes")
  if (!auth.authorized) {
    return auth.response
  }

  const { noteId } = await params
  const noteIdNum = parseInt(noteId, 10)

  if (isNaN(noteIdNum)) {
    return Response.json(
      { error: "Invalid noteId" },
      { status: 400 }
    )
  }

  const note = await db.query.AppleNotes.findFirst({
    where: eq(AppleNotes.noteId, noteIdNum),
  })

  if (!note) {
    await logRead({
      type: "apple-note",
      description: `Note not found: ${noteId}`,
      count: 0,
      token: auth.token,
    })

    return Response.json(
      { success: false, error: "Note not found" },
      { status: 404 }
    )
  }

  await logRead({
    type: "apple-note",
    description: `Fetched note: ${noteId}`,
    count: 1,
    token: auth.token,
  })

  return Response.json({
    success: true,
    note,
  })
}
