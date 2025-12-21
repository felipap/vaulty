import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/admin-auth"
import { db } from "@/db"
import { Devices } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const [updated] = await db
    .update(Devices)
    .set({ approved: true })
    .where(eq(Devices.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(Devices)
    .where(eq(Devices.id, id))
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
