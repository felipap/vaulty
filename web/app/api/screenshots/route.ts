import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { Screenshots, Devices } from "@/db/schema"
import { resizeScreenshot } from "@/lib/image-resize"
import { config } from "@/lib/config"
import sharp from "sharp"
import { eq } from "drizzle-orm"

type DeviceValidation =
  | { valid: true; deviceDbId: string }
  | { valid: false; error: string }

async function validateDevice(request: NextRequest): Promise<DeviceValidation> {
  const deviceId = request.headers.get("x-device-id")

  if (!deviceId) {
    return { valid: false, error: "Missing device ID" }
  }

  const device = await db.query.Devices.findFirst({
    where: eq(Devices.deviceId, deviceId),
  })

  if (!device) {
    return { valid: false, error: "Device not registered" }
  }

  if (!device.approved) {
    return { valid: false, error: "Device not approved" }
  }

  await db
    .update(Devices)
    .set({ lastSeenAt: new Date() })
    .where(eq(Devices.deviceId, deviceId))

  return { valid: true, deviceDbId: device.id }
}

export async function POST(request: NextRequest) {
  const deviceCheck = await validateDevice(request)

  if (!deviceCheck.valid) {
    return NextResponse.json({ error: deviceCheck.error }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""

  let imageBuffer: Buffer

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const file = formData.get("screenshot") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const maxBytes = config.upload.maxFileSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max size: ${config.upload.maxFileSizeMB}MB` },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    imageBuffer = Buffer.from(arrayBuffer)
  } else {
    const body = await request.arrayBuffer()
    imageBuffer = Buffer.from(body)
  }

  const resizedBuffer = await resizeScreenshot(imageBuffer)
  const metadata = await sharp(resizedBuffer).metadata()

  const base64Data = resizedBuffer.toString("base64")
  const dataUrl = `data:image/webp;base64,${base64Data}`

  const [screenshot] = await db
    .insert(Screenshots)
    .values({
      deviceId: deviceCheck.deviceDbId,
      data: dataUrl,
      width: metadata.width || 0,
      height: metadata.height || 0,
      sizeBytes: resizedBuffer.length,
    })
    .returning()

  return NextResponse.json({
    id: screenshot.id,
    width: screenshot.width,
    height: screenshot.height,
    sizeBytes: screenshot.sizeBytes,
    capturedAt: screenshot.capturedAt,
  })
}
