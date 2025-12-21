import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { Devices } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  const deviceId = request.headers.get("x-device-id")

  if (!deviceId) {
    return NextResponse.json({ error: "Missing device ID" }, { status: 400 })
  }

  const existing = await db.query.Devices.findFirst({
    where: eq(Devices.deviceId, deviceId),
  })

  if (existing) {
    await db
      .update(Devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(Devices.deviceId, deviceId))

    return NextResponse.json({
      registered: true,
      approved: existing.approved,
      deviceId: existing.deviceId,
    })
  }

  const [device] = await db
    .insert(Devices)
    .values({
      deviceId,
      name: request.headers.get("x-device-name") || "Unknown Device",
      approved: false,
      lastSeenAt: new Date(),
    })
    .returning()

  return NextResponse.json({
    registered: true,
    approved: device.approved,
    deviceId: device.deviceId,
  })
}
